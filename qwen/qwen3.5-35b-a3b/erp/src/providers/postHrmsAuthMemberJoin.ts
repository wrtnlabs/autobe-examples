import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsOrganizationMemberAtSummaryTransformer } from "../transformers/HrmsOrganizationMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsAuthMemberJoin(props: {
  ip: string;
  body: IHrmsMember.IJoin;
}): Promise<IHrmsMember.IAuthorized> {
  // Check email duplicate
  const existing = await MyGlobal.prisma.hrms_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Calculate token expiration times
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Create member with hashed password
  const member = await MyGlobal.prisma.hrms_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      avatar_uri: null,
      phone_number: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: "",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: "",
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session with tokens
  const session = await MyGlobal.prisma.hrms_member_sessions.create({
    data: {
      id: v4(),
      hrms_member_id: member.id,
      current_organization_id: null,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      user_agent: "",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // Update session with correct session_id in tokens
  const updatedAccessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const updatedRefreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrms_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: updatedAccessToken,
      refresh_token: updatedRefreshToken,
    },
  });
  // Get organization memberships with proper transformer
  const organizationMemberships =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: { hrms_member_id: member.id, deleted_at: null },
      ...HrmsOrganizationMemberAtSummaryTransformer.select(),
    });
  const transformedMemberships = await ArrayUtil.asyncMap(
    organizationMemberships,
    HrmsOrganizationMemberAtSummaryTransformer.transform,
  );
  // Build member response
  const memberResponse: IHrmsMember = {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_uri: member.avatar_uri ?? null,
    phone_number: member.phone_number ?? null,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    organization_memberships: transformedMemberships,
  };
  // Build token response
  const token: IAuthorizationToken = {
    access: updatedAccessToken,
    refresh: updatedRefreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    ...memberResponse,
    token,
  } satisfies IHrmsMember.IAuthorized;
}
