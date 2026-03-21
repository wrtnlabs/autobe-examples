import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthGuestJoin(props: {
  ip: string;
  body: IErpHrmGuest.IJoin;
}): Promise<IErpHrmGuest.IAuthorized> {
  // 1. Check for duplicate email
  const existingMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingMember) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member with hashed password
  const memberId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const member = await MyGlobal.prisma.erp_hrm_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password: hashedPassword,
      display_name: props.body.displayName,
      avatar_image: props.body.avatar ?? null,
      phone_number: props.body.phoneNumber ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create organization
  const organizationId = v4() as string & tags.Format<"uuid">;
  const organization = await MyGlobal.prisma.erp_hrm_organizations.create({
    data: {
      id: organizationId,
      owner_id: memberId,
      name: props.body.organization.name,
      description: props.body.organization.description ?? null,
      logo_image: props.body.organization.logo ?? null,
      currency: props.body.organization.currency,
      timezone: props.body.organization.timezone,
      fiscal_start_month: props.body.organization.fiscalStartMonth,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Create Owner role (built-in)
  const roleId = v4() as string & tags.Format<"uuid">;
  const ownerRole = await MyGlobal.prisma.erp_hrm_roles.create({
    data: {
      id: roleId,
      organization_id: organizationId,
      name: "Owner",
      is_builtin: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create employee record
  const employeeId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.erp_hrm_employees.create({
    data: {
      id: employeeId,
      erp_hrm_member_id: memberId,
      erp_hrm_organization_id: organizationId,
      erp_hrm_role_id: roleId,
      erp_hrm_department_id: null,
      position: null,
      employment_type: "full_time",
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Create member session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_member_id: memberId,
      erp_hrm_organization_id: organizationId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      expired_at: refreshExpires,
    },
  });
  // 7. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 8. Return IAuthorized
  return {
    id: member.id as string & tags.Format<"uuid">,
    fingerprint: "",
    sessions: [],
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      (member.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null) ?? null,
    token,
  } satisfies IErpHrmGuest.IAuthorized;
}
