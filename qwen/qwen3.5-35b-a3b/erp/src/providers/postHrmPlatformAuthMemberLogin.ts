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
import { HrmPlatformMemberAtSummaryTransformer } from "../transformers/HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformMemberEmailVerificationAtSummaryTransformer } from "../transformers/HrmPlatformMemberEmailVerificationAtSummaryTransformer";
import { HrmPlatformMemberPasswordResetAtSummaryTransformer } from "../transformers/HrmPlatformMemberPasswordResetAtSummaryTransformer";
import { HrmPlatformMemberSessionAtSummaryTransformer } from "../transformers/HrmPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberLogin(props: {
  ip: string;
  body: IHrmPlatformMember.ILogin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
    ...HrmPlatformMemberAtSummaryTransformer.select(),
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (!member.is_active) {
    throw new HttpException("Account is disabled", 403);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      access_token: "",
      refresh_token: "",
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
      ip_address: props.ip,
      user_agent: "",
      created_at: new Date(),
      updated_at: new Date(),
      expired_at: accessExpires,
    },
  });
  const nowIso = new Date().toISOString();
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrm_platform_members.update({
    where: { id: member.id },
    data: { last_login_at: new Date() },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  const sessionSummaries =
    await MyGlobal.prisma.hrm_platform_member_sessions.findMany({
      where: { hrm_platform_member_id: member.id },
      ...HrmPlatformMemberSessionAtSummaryTransformer.select(),
    });
  const passwordResetTokens =
    await MyGlobal.prisma.hrm_platform_member_password_resets.findMany({
      where: { member_id: member.id },
      ...HrmPlatformMemberPasswordResetAtSummaryTransformer.select(),
    });
  const emailVerifications =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.findMany({
      where: { hrm_platform_member_id: member.id },
      ...HrmPlatformMemberEmailVerificationAtSummaryTransformer.select(),
    });
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
    sessions: await ArrayUtil.asyncMap(sessionSummaries, (r) =>
      HrmPlatformMemberSessionAtSummaryTransformer.transform(r),
    ),
    passwordResetTokens: await ArrayUtil.asyncMap(passwordResetTokens, (r) =>
      HrmPlatformMemberPasswordResetAtSummaryTransformer.transform(r),
    ),
    emailVerifications: await ArrayUtil.asyncMap(emailVerifications, (r) =>
      HrmPlatformMemberEmailVerificationAtSummaryTransformer.transform(r),
    ),
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
// export async function postHrmPlatformAuthMemberLogin(props: {
//   ip: string;
//   body: IHrmPlatformMember.ILogin;
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