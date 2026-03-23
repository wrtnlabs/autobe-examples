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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.ICreate;
}): Promise<IHrmPlatformTimelog> {
  // Fetch the member session to get the organization context
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  // Validate organization_id is not null before using it
  if (session.hrm_platform_organization_id === null) {
    throw new HttpException("Session organization ID is null", 500);
  }
  // Fetch the employee record for the authenticated member in the current organization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        member_id_organization_id: {
          member_id: props.member.id,
          organization_id: session.hrm_platform_organization_id,
        },
      },
      select: {
        id: true,
        status: true,
        organization_id: true,
      },
    });
  // Validate employee status is active
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  // Validate project exists and belongs to the same organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.body.project_id,
      },
      select: {
        id: true,
        organization_id: true,
        status: true,
      },
    },
  );
  // Verify project belongs to the same organization as the employee
  if (project.organization_id !== employee.organization_id) {
    throw new HttpException(
      "Project does not belong to your organization",
      403,
    );
  }
  // Validate project status is active (only active projects accept new timelogs)
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 400);
  }
  // If task_id is provided, validate it exists and belongs to the same project
  if (props.body.task_id != null && props.body.task_id !== undefined) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: {
        id: props.body.task_id,
      },
      select: {
        id: true,
        hrm_platform_project_id: true,
      },
    });
    // Verify task belongs to the same project
    if (task.hrm_platform_project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // Create the timelog using the collector
  const created = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: await HrmPlatformTimelogCollector.collect({
      body: props.body,
      hrmPlatformEmployees: {
        id: employee.id,
      } satisfies IEntity,
    }),
    ...HrmPlatformTimelogTransformer.select(),
  });
  // Transform and return the created timelog
  return await HrmPlatformTimelogTransformer.transform(created);
}
