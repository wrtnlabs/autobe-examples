import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformEmployeeInvitationCollector } from "../collectors/HrmPlatformEmployeeInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeInvitationTransformer } from "../transformers/HrmPlatformEmployeeInvitationTransformer";
import { HrmPlatformEmployeeTransformer } from "../transformers/HrmPlatformEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberEmployeeInvitations(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeInvitation.ICreate;
}): Promise<IHrmPlatformEmployeeInvitation> {
  // Get member's organization membership to determine current organization context
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Member has no organization membership", 403);
  }
  const organizationId = membership.hrm_platform_organization_id;
  // Validate role exists in organization
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      id: props.body.role_id,
      organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  // Validate department exists if provided
  if (props.body.department_id) {
    const department = await MyGlobal.prisma.hrm_platform_departments.findFirst(
      {
        where: {
          id: props.body.department_id,
          deleted_at: null,
        },
      },
    );
    if (!department) {
      throw new HttpException("Department not found", 404);
    }
  }
  // Check if member with this email already exists
  const existingMember = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existingMember) {
    // Member exists - check for existing employee record in this organization
    const existingEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          member_id: existingMember.id,
          organization_id: organizationId,
          deleted_at: null,
        },
      });
    if (existingEmployee) {
      throw new HttpException(
        "Employee already exists in this organization",
        409,
      );
    }
    // Create employee record directly when member exists
    const employee = await MyGlobal.prisma.hrm_platform_employees.create({
      data: {
        id: v4(),
        member_id: existingMember.id,
        organization_id: organizationId,
        role_id: props.body.role_id,
        department_id: props.body.department_id ?? null,
        position: props.body.position ?? null,
        employment_type: props.body.employment_type,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...HrmPlatformEmployeeTransformer.select(),
    });
    // Create an invitation record with status 'accepted' to match return type
    const invitation =
      await MyGlobal.prisma.hrm_platform_employee_invitations.create({
        data: {
          id: v4(),
          organization_id: organizationId,
          invited_by: props.member.id,
          role_id: props.body.role_id,
          department_id: props.body.department_id ?? null,
          email: props.body.email,
          position: props.body.position ?? null,
          employment_type: props.body.employment_type,
          status: "accepted",
          invited_at: new Date(),
          expires_at: new Date(props.body.expires_at),
          accepted_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        ...HrmPlatformEmployeeInvitationTransformer.select(),
      });
    return await HrmPlatformEmployeeInvitationTransformer.transform(invitation);
  } else {
    // Member does not exist - create pending invitation
    // Check for existing pending invitation in this organization
    const existingInvitation =
      await MyGlobal.prisma.hrm_platform_employee_invitations.findFirst({
        where: {
          email: props.body.email,
          organization_id: organizationId,
          status: "pending",
          deleted_at: null,
        },
      });
    if (existingInvitation) {
      throw new HttpException(
        "Pending invitation already exists for this email",
        409,
      );
    }
    // Create invitation using collector
    const invitation =
      await MyGlobal.prisma.hrm_platform_employee_invitations.create({
        data: await HrmPlatformEmployeeInvitationCollector.collect({
          body: props.body,
          hrmPlatformOrganizations: { id: organizationId },
          hrmPlatformMembers: { id: props.member.id },
        }),
        ...HrmPlatformEmployeeInvitationTransformer.select(),
      });
    return await HrmPlatformEmployeeInvitationTransformer.transform(invitation);
  }
}
