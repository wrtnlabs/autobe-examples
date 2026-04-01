import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformInvitationCollector } from "../collectors/HrmPlatformInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformInvitationTransformer } from "../transformers/HrmPlatformInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmPlatformInvitation.ICreate;
}): Promise<IHrmPlatformInvitation> {
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Not an employee of any organization", 403);
  }
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: employee.role_id,
        deleted_at: null,
      },
      select: {
        permission: true,
      },
    });
  const hasManagePermission = rolePermissions.some(
    (p) => p.permission === "employee:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  const organizationId = employee.organization_id as string &
    tags.Format<"uuid">;
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: props.body.role_id, deleted_at: null },
  });
  if (!role || role.organization_id !== organizationId) {
    throw new HttpException("Invalid or deleted role", 404);
  }
  const existingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        organization_id: organizationId,
        deleted_at: null,
        user: {
          email: props.body.email,
        },
      },
    });
  if (existingEmployee) {
    throw new HttpException(
      "Email already has an employee in this organization",
      409,
    );
  }
  const existingInvitation =
    await MyGlobal.prisma.hrm_platform_invitations.findFirst({
      where: {
        organization_id: organizationId,
        email: props.body.email,
        status: "pending",
        expires_at: { gt: new Date() },
        deleted_at: null,
      },
    });
  if (existingInvitation) {
    throw new HttpException(
      "Pending invitation already exists for this email",
      409,
    );
  }
  const existingMember = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  const invitation = await MyGlobal.prisma.hrm_platform_invitations.create({
    data: await HrmPlatformInvitationCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: organizationId },
      hrmPlatformMembers: { id: props.member.id },
    }),
    ...HrmPlatformInvitationTransformer.select(),
  });
  if (existingMember) {
    await MyGlobal.prisma.hrm_platform_employees.create({
      data: {
        id: v4(),
        organization_id: organizationId,
        user_id: existingMember.id,
        role_id: props.body.role_id,
        employment_type: "full-time",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    await MyGlobal.prisma.hrm_platform_invitations.update({
      where: { id: invitation.id },
      data: {
        status: "accepted",
        accepted_at: new Date(),
        user: { connect: { id: existingMember.id } },
      },
    });
  }
  const updatedInvitation =
    await MyGlobal.prisma.hrm_platform_invitations.findUniqueOrThrow({
      where: { id: invitation.id },
      ...HrmPlatformInvitationTransformer.select(),
    });
  return await HrmPlatformInvitationTransformer.transform(updatedInvitation);
}
