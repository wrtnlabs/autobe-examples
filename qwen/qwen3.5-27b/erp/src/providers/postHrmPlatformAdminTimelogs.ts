import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTimelogCollector } from "../collectors/HrmPlatformTimelogCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAdminTimelogs(props: {
  admin: AdminPayload;
  body: IHrmPlatformTimelog.ICreate;
}): Promise<IHrmPlatformTimelog> {
  // Step 1: Validate project exists and get organization_id from project
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.body.project_id },
      select: {
        id: true,
        organization_id: true,
        status: true,
      },
    },
  );
  // Step 2: Check project status allows time entries
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 400);
  }
  // Step 3: Get employee record for this organization (first active employee)
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        organization_id: project.organization_id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  // Step 4: Validate task if provided
  if (props.body.task_id) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: { id: true, hrm_platform_project_id: true },
    });
    if (task.hrm_platform_project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // Step 5: Validate date is not in future
  const now = new Date();
  const inputDate = new Date(props.body.date);
  if (inputDate > now) {
    throw new HttpException("Date cannot be in the future", 400);
  }
  // Step 6: Validate duration is 1-1440 minutes
  if (props.body.duration < 1 || props.body.duration > 1440) {
    throw new HttpException("Duration must be between 1 and 1440 minutes", 400);
  }
  // Step 7: Create timelog using collector
  const created = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: await HrmPlatformTimelogCollector.collect({
      body: props.body,
      hrmPlatformEmployees: { id: employee.id },
    }),
    ...HrmPlatformTimelogTransformer.select(),
  });
  // Step 8: Transform and return
  return await HrmPlatformTimelogTransformer.transform(created);
}
