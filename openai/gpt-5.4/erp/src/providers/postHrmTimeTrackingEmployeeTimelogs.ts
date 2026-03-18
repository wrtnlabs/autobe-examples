import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTimelogCollector } from "../collectors/HrmTimeTrackingTimelogCollector";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingEmployeeTimelogs(props: {
  employee: EmployeePayload;
  body: IHrmTimeTrackingTimelog.ICreate;
}): Promise<IHrmTimeTrackingTimelog> {
  if (props.body.durationMinutes <= 0) {
    throw new HttpException("Duration must be positive", 400);
  }
  if (
    new globalThis.Date(props.body.workedOn).getTime() > globalThis.Date.now()
  ) {
    throw new HttpException("Worked date cannot be in the future", 400);
  }
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: props.employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.body.hrmTimeTrackingProjectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (
    props.body.hrmTimeTrackingTaskId !== undefined &&
    props.body.hrmTimeTrackingTaskId !== null
  ) {
    await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.body.hrmTimeTrackingTaskId,
        hrm_time_tracking_project_id: project.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const created = await MyGlobal.prisma.hrm_time_tracking_timelogs.create({
    data: await HrmTimeTrackingTimelogCollector.collect({
      body: props.body,
      hrmTimeTrackingOrganizations: {
        id: project.hrm_time_tracking_organization_id,
      },
      hrmTimeTrackingEmployees: {
        id: employee.id,
      },
    }),
    select: {
      id: true,
    },
  });
  const timelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findUniqueOrThrow({
      where: {
        id: created.id,
      },
      ...HrmTimeTrackingTimelogTransformer.select(),
    });
  return await HrmTimeTrackingTimelogTransformer.transform(timelog);
}
