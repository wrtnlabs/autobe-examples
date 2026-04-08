import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTimelogCollector } from "../collectors/HrmPlatformTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.ICreate;
}): Promise<IHrmPlatformTimelog> {
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.body.hrm_platform_project_id,
      },
    });
  if (!projectMember) {
    throw new HttpException("Employee is not assigned to this project", 403);
  }
  if (props.body.hrm_platform_task_id) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: {
        id: props.body.hrm_platform_task_id,
        deleted_at: null,
      },
      select: {
        hrm_platform_project_id: true,
      },
    });
    if (
      !task ||
      task.hrm_platform_project_id !== props.body.hrm_platform_project_id
    ) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  const record = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: await HrmPlatformTimelogCollector.collect({
      body: props.body,
      hrmPlatformEmployees: employee,
    }),
    ...HrmPlatformTimelogTransformer.select(),
  });
  return await HrmPlatformTimelogTransformer.transform(record);
}
