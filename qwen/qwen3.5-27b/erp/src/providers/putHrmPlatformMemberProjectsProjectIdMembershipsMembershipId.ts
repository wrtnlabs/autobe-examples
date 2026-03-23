import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMembershipTransformer } from "../transformers/HrmPlatformProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMembership.IUpdate;
}): Promise<IHrmPlatformProjectMembership> {
  // Verify project exists and get organization context
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { id: true, organization_id: true },
    },
  );
  // Get the member's employee record to verify organization membership
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: project.organization_id,
      deleted_at: null,
    },
    select: { id: true, role_id: true },
  });
  if (employee === null) {
    throw new HttpException("You're not enrolled in this organization", 403);
  }
  // Check if user has project:manage permission through their role
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.role_id,
        permission_code: "project:manage",
        deleted_at: null,
      },
    });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify membership exists, is active, and belongs to the specified project
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findUniqueOrThrow({
      where: { id: props.membershipId },
      select: { id: true, hrm_platform_project_id: true, deleted_at: true },
    });
  if (membership.deleted_at !== null) {
    throw new HttpException("Membership has been deleted", 409);
  }
  if (membership.hrm_platform_project_id !== props.projectId) {
    throw new HttpException(
      "Membership does not belong to the specified project",
      404,
    );
  }
  // Update the membership with the new role if provided
  const updatedMembership =
    await MyGlobal.prisma.hrm_platform_project_memberships.update({
      where: { id: props.membershipId },
      data: {
        ...(props.body.role !== undefined && { role: props.body.role }),
        updated_at: new Date(),
      },
      ...HrmPlatformProjectMembershipTransformer.select(),
    });
  return await HrmPlatformProjectMembershipTransformer.transform(
    updatedMembership,
  );
}
