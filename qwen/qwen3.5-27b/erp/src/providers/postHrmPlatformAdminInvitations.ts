import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformEmployeeInvitationCollector } from "../collectors/HrmPlatformEmployeeInvitationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformEmployeeInvitationTransformer } from "../transformers/HrmPlatformEmployeeInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAdminInvitations(props: {
  admin: AdminPayload;
  body: IHrmPlatformEmployeeInvitation.ICreate;
}): Promise<IHrmPlatformEmployeeInvitation> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.admin.session_id },
      select: { hrm_platform_organization_id: true },
    });
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: session.hrm_platform_organization_id ?? undefined },
      select: { id: true },
    });
  await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.body.role_id,
      hrm_platform_organization_id: organization.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const existingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        organization: { id: organization.id },
        member: { email: props.body.email },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingEmployee) {
    throw new HttpException(
      "Email already belongs to an existing employee in this organization",
      409,
    );
  }
  const existingInvitation =
    await MyGlobal.prisma.hrm_platform_employee_invitations.findFirst({
      where: {
        email: props.body.email,
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingInvitation) {
    throw new HttpException(
      "A pending invitation already exists for this email address",
      409,
    );
  }
  const existingMember = await MyGlobal.prisma.hrm_platform_members.findUnique({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existingMember) {
    await MyGlobal.prisma.hrm_platform_employees.create({
      data: {
        id: v4(),
        organization: { connect: { id: organization.id } },
        member: { connect: { id: existingMember.id } },
        role: { connect: { id: props.body.role_id } },
        employment_type: "full-time",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  const created =
    await MyGlobal.prisma.hrm_platform_employee_invitations.create({
      data: await HrmPlatformEmployeeInvitationCollector.collect({
        body: props.body,
        hrmPlatformOrganizations: organization,
      }),
      ...HrmPlatformEmployeeInvitationTransformer.select(),
    });
  return await HrmPlatformEmployeeInvitationTransformer.transform(created);
}
