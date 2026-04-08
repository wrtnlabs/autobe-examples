import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformOrganizationCollector } from "../collectors/HrmPlatformOrganizationCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberJoin(props: {
  ip: string;
  body: IHrmPlatformMember.IJoin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member account with hashed password
  const now = new Date();
  const member = await MyGlobal.prisma.hrm_platform_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.name ?? null,
      avatar_uri: props.body.avatar_uri ?? null,
      phone_number: props.body.phone_number ?? null,
      is_active: true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create initial organization
  const organization = await MyGlobal.prisma.hrm_platform_organizations.create({
    data: await HrmPlatformOrganizationCollector.collect({
      body: {
        name: props.body.org_name,
        description: props.body.org_description ?? null,
        currency: props.body.org_currency,
        timezone: props.body.org_timezone ?? "UTC",
        fiscal_start_month: props.body.org_fiscal_month ?? 1,
      },
      hrmPlatformMembers: { id: member.id },
    }),
  });
  // 4. Create session with expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      organization_id: organization.id,
      access_token: "",
      refresh_token: "",
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
      ip_address: props.body.ip ?? props.ip,
      user_agent: "",
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Update session with tokens
  await MyGlobal.prisma.hrm_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
    },
  });
  // 7. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name ?? undefined,
    avatar_uri: member.avatar_uri ?? undefined,
    phone_number: member.phone_number ?? undefined,
    is_active: member.is_active,
    last_login_at: member.last_login_at?.toISOString() ?? undefined,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    sessions: [],
    passwordResetTokens: [],
    emailVerifications: [],
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name ?? undefined,
      avatar_uri: member.avatar_uri ?? undefined,
      phone_number: member.phone_number ?? undefined,
      is_active: member.is_active,
      last_login_at: member.last_login_at?.toISOString() ?? null,
      created_at: member.created_at.toISOString(),
      updated_at: member.updated_at.toISOString(),
      deleted_at: member.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformMember.ISummary,
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
// import { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformAuthMemberJoin(props: {
//   ip: string;
//   body: IHrmPlatformMember.IJoin;
// }): Promise<IHrmPlatformMember.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     display_name: ...,
//     avatar_uri: ...,
//     phone_number: ...,
//     is_active: ...,
//     last_login_at: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     sessions: await ArrayUtil.asyncMap(..., (r) => HrmPlatformMemberSessionAtSummaryTransformer.transform(r)),
//     passwordResetTokens: await ArrayUtil.asyncMap(..., (r) => HrmPlatformMemberPasswordResetAtSummaryTransformer.transform(r)),
//     emailVerifications: await ArrayUtil.asyncMap(..., (r) => HrmPlatformMemberEmailVerificationAtSummaryTransformer.transform(r)),
//     member: await HrmPlatformMemberAtSummaryTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------