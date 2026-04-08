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
import { HrmPlatformMemberAtSummaryTransformer } from "../transformers/HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformMemberEmailVerificationAtSummaryTransformer } from "../transformers/HrmPlatformMemberEmailVerificationAtSummaryTransformer";
import { HrmPlatformMemberPasswordResetAtSummaryTransformer } from "../transformers/HrmPlatformMemberPasswordResetAtSummaryTransformer";
import { HrmPlatformMemberSessionAtSummaryTransformer } from "../transformers/HrmPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberJoin(props: {
  ip: string;
  body: IHrmPlatformMember.IJoin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  // 1. Validate required fields
  if (!props.body.org_name || props.body.org_name.length === 0) {
    throw new HttpException("Organization name is required", 400);
  }
  if (!props.body.org_currency || props.body.org_currency.length === 0) {
    throw new HttpException("Organization currency is required", 400);
  }
  // 2. Check duplicate email
  const existingMember = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingMember) {
    throw new HttpException("Email already registered", 409);
  }
  // 3. Create member with hashed password
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
  // 4. Create organization using Collector
  const organizationInput = await HrmPlatformOrganizationCollector.collect({
    body: {
      name: props.body.org_name,
      description: props.body.org_description,
      currency: props.body.org_currency,
      timezone: props.body.org_timezone ?? "UTC",
      fiscal_start_month: props.body.org_fiscal_month ?? 1,
    },
    hrmPlatformMembers: {
      id: member.id,
    },
  });
  const organization = await MyGlobal.prisma.hrm_platform_organizations.create({
    data: organizationInput,
  });
  // 5. Create Owner role (built-in)
  const ownerRole = await MyGlobal.prisma.hrm_platform_roles.create({
    data: {
      id: v4(),
      organization_id: organization.id,
      name: "Owner",
      description: "Organization owner with full access",
      role_kind: "built_in",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Generate JWT tokens (initial placeholders)
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: "",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: "",
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Create session
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      organization_id: organization.id,
      access_token: token.access,
      refresh_token: token.refresh,
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
  // 8. Update session tokens with correct session_id
  const updatedToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  await MyGlobal.prisma.hrm_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: updatedToken.access,
      refresh_token: updatedToken.refresh,
      updated_at: now,
    },
  });
  // 9. Update member last_login_at
  await MyGlobal.prisma.hrm_platform_members.update({
    where: { id: member.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });
  // 10. Get sessions, passwordResetTokens, emailVerifications
  const sessionsData =
    await MyGlobal.prisma.hrm_platform_member_sessions.findMany({
      where: { hrm_platform_member_id: member.id },
      ...HrmPlatformMemberSessionAtSummaryTransformer.select(),
    });
  const passwordResetTokensData =
    await MyGlobal.prisma.hrm_platform_member_password_resets.findMany({
      where: { member_id: member.id },
      ...HrmPlatformMemberPasswordResetAtSummaryTransformer.select(),
    });
  const emailVerificationsData =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.findMany({
      where: { hrm_platform_member_id: member.id },
      ...HrmPlatformMemberEmailVerificationAtSummaryTransformer.select(),
    });
  // 11. Return IAuthorized
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name ?? undefined,
    avatar_uri: member.avatar_uri ?? undefined,
    phone_number: member.phone_number ?? undefined,
    is_active: member.is_active,
    last_login_at: member.last_login_at
      ? toISOStringSafe(member.last_login_at)
      : undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    sessions: await ArrayUtil.asyncMap(
      sessionsData,
      HrmPlatformMemberSessionAtSummaryTransformer.transform,
    ),
    passwordResetTokens: await ArrayUtil.asyncMap(
      passwordResetTokensData,
      HrmPlatformMemberPasswordResetAtSummaryTransformer.transform,
    ),
    emailVerifications: await ArrayUtil.asyncMap(
      emailVerificationsData,
      HrmPlatformMemberEmailVerificationAtSummaryTransformer.transform,
    ),
    member: await HrmPlatformMemberAtSummaryTransformer.transform({
      id: member.id,
      email: member.email,
      password_hash: member.password_hash,
      display_name: member.display_name,
      avatar_uri: member.avatar_uri,
      phone_number: member.phone_number,
      is_active: member.is_active,
      last_login_at: member.last_login_at,
      created_at: member.created_at,
      updated_at: member.updated_at,
      deleted_at: member.deleted_at,
      sessions: await MyGlobal.prisma.hrm_platform_member_sessions.findMany({
        where: { hrm_platform_member_id: member.id },
      }),
      passwordResetTokens:
        await MyGlobal.prisma.hrm_platform_member_password_resets.findMany({
          where: { member_id: member.id },
        }),
      emailVerifications:
        await MyGlobal.prisma.hrm_platform_member_email_verifications.findMany({
          where: { hrm_platform_member_id: member.id },
        }),
      employees: [],
      employeeSnapshots: [],
      ownedOrganizations: [],
      uploadedFiles: [],
      taskHistories: [],
      timesheetActions: [],
      activityLogs: [],
    }),
    token: updatedToken,
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