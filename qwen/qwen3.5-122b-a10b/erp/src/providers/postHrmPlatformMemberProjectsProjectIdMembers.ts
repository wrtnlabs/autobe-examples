import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, deleted_at: true, hrm_platform_organization_id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.deleted_at !== null) {
    throw new HttpException("Project has been deleted", 400);
  }
  // Verify employee exists and belongs to the same organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.body.employee_id },
    select: { id: true, deleted_at: true, hrm_platform_organization_id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee has been deactivated", 400);
  }
  if (
    employee.hrm_platform_organization_id !==
    project.hrm_platform_organization_id
  ) {
    throw new HttpException(
      "Employee does not belong to the same organization as the project",
      400,
    );
  }
  // Validate role
  if (props.body.role !== "member" && props.body.role !== "project-lead") {
    throw new HttpException(
      "Invalid role. Must be 'member' or 'project-lead'",
      400,
    );
  }
  // Create project membership using collector
  const created = await MyGlobal.prisma.hrm_platform_project_members.create({
    data: await HrmPlatformProjectMemberCollector.collect({
      body: props.body,
      employee: { id: employee.id },
      project: { id: project.id },
    }),
    ...HrmPlatformProjectMemberTransformer.select(),
  });
  return await HrmPlatformProjectMemberTransformer.transform(created);
}
