import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmMemberTransformer } from "../transformers/ErpHrmMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberJoin(props: {
  ip: string;
  body: IErpHrmMember.IJoin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);
  // 3. Create member record
  const now = new Date();
  const memberId = v4();
  const member = await MyGlobal.prisma.erp_hrm_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...ErpHrmMemberTransformer.select(),
  });
  // 4. Resolve pending invitations
  const pendingInvitations = await MyGlobal.prisma.erp_hrm_invitations.findMany(
    {
      where: {
        email: props.body.email,
        status: "pending",
      },
      select: {
        id: true,
        erp_hrm_organization_id: true,
      },
    },
  );
  for (const invitation of pendingInvitations) {
    // Find the default Employee built-in role for this organization
    const employeeRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        erp_hrm_organization_id: invitation.erp_hrm_organization_id,
        name: "Employee",
        is_builtin: true,
      },
      select: { id: true },
    });
    if (employeeRole === null) continue;
    // Create the organization member record linking new member to organization
    await MyGlobal.prisma.erp_hrm_organization_members.create({
      data: {
        id: v4(),
        organization: { connect: { id: invitation.erp_hrm_organization_id } },
        member: { connect: { id: memberId } },
        role: { connect: { id: employeeRole.id } },
        department_id: undefined,
        employment_type: "full-time",
        status: "active",
        position: undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Mark invitation as accepted and link to new member
    await MyGlobal.prisma.erp_hrm_invitations.update({
      where: { id: invitation.id },
      data: {
        erp_hrm_member_id: memberId,
        status: "accepted",
        updated_at: now,
      },
    });
  }
  // 5. Create session record (expired_at = refresh token lifetime: 30 days)
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: v4(),
      member: { connect: { id: memberId } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
    select: { id: true },
  });
  // 6. Issue JWT access and refresh tokens
  const createdAtStr = now.toISOString();
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: session.id,
        created_at: createdAtStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAtStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 7. Build and return IErpHrmMember.IAuthorized
  const memberDto = await ErpHrmMemberTransformer.transform(member);
  return {
    ...memberDto,
    member: memberDto,
    token,
  } satisfies IErpHrmMember.IAuthorized;
}
