import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTimelogCollector } from "../collectors/HrmTimeTrackingTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimelog.ICreate;
}): Promise<IHrmTimeTrackingTimelog> {
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const employee = await prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        status: true,
      },
    });
    if (employee.status !== "active") {
      throw new HttpException(
        "Employee is not allowed to create timelogs",
        403,
      );
    }
    const project = await prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.body.project_id,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (project.status === "archived" || project.status === "completed") {
      throw new HttpException("Project does not accept new timelogs", 400);
    }
    if (props.body.task_id !== undefined && props.body.task_id !== null) {
      await prisma.hrm_time_tracking_tasks.findFirstOrThrow({
        where: {
          id: props.body.task_id,
          project: {
            id: project.id,
          },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    }
    return await prisma.hrm_time_tracking_timelogs.create({
      data: await HrmTimeTrackingTimelogCollector.collect({
        body: props.body,
        organization: { id: employee.organization_id },
        employee: { id: employee.id },
      }),
      ...HrmTimeTrackingTimelogTransformer.select(),
    });
  });
  return await HrmTimeTrackingTimelogTransformer.transform(created);
}
