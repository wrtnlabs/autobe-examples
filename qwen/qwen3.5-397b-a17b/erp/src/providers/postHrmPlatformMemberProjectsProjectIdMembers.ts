import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformProjectMemberCollector } from "../collectors/HrmPlatformProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMemberTransformer } from "../transformers/HrmPlatformProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMember.ICreate;
}): Promise<IHrmPlatformProjectMember> {
  // Verify project exists and is not deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (!project) {
    throw new HttpException("Project not found", 404);
  }
  // Validate employee exists, belongs to same organization as project, and is active
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      id: props.body.hrm_platform_employee_id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      status: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Verify employee belongs to same organization as project
  if (employee.organization_id !== project.organization_id) {
    throw new HttpException(
      "Employee does not belong to your organization",
      400,
    );
  }
  // Verify employee is active
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 400);
  }
  // Check for existing membership (duplicate assignment)
  const existingMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: props.body.hrm_platform_employee_id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (existingMembership) {
    throw new HttpException(
      "Employee is already assigned to this project",
      409,
    );
  }
  // Create project membership using collector
  const created = await MyGlobal.prisma.hrm_platform_project_members.create({
    data: await HrmPlatformProjectMemberCollector.collect({
      body: props.body,
      hrmPlatformProjects: { id: props.projectId },
    }),
    ...HrmPlatformProjectMemberTransformer.select(),
  });
  // Transform and return the response
  return await HrmPlatformProjectMemberTransformer.transform(created);
}
