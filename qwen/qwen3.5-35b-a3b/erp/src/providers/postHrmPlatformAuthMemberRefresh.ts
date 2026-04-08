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
import { HrmPlatformMemberEmailVerificationAtSummaryTransformer } from "../transformers/HrmPlatformMemberEmailVerificationAtSummaryTransformer";
import { HrmPlatformMemberPasswordResetAtSummaryTransformer } from "../transformers/HrmPlatformMemberPasswordResetAtSummaryTransformer";
import { HrmPlatformMemberSessionAtSummaryTransformer } from "../transformers/HrmPlatformMemberSessionAtSummaryTransformer";
import { HrmPlatformMemberTransformer } from "../transformers/HrmPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberRefresh(props: {
  body: IHrmPlatformMember.IRefresh;
}): Promise<IHrmPlatformMember.IAuthorized> {
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  ) as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrm_platform_member_id: decoded.id,
      refresh_token_expires_at: {
        gt: new Date(),
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      is_active: true,
      deleted_at: true,
    },
  });
  if (member.is_active === false || member.deleted_at !== null) {
    throw new HttpException("Account has been deleted or deactivated", 403);
  }
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const currentTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const newAccessToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: currentTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: currentTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrm_platform_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      access_token_expires_at: new Date(accessExpires),
      refresh_token_expires_at: new Date(refreshExpires),
      expired_at: new Date(refreshExpires),
    },
  });
  const memberData =
    await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
      ...HrmPlatformMemberTransformer.select(),
    });
  const transformedMember =
    await HrmPlatformMemberTransformer.transform(memberData);
  return {
    id: transformedMember.id,
    email: transformedMember.email,
    display_name: transformedMember.display_name,
    avatar_uri: transformedMember.avatar_uri,
    phone_number: transformedMember.phone_number,
    is_active: transformedMember.is_active,
    last_login_at: transformedMember.last_login_at,
    created_at: transformedMember.created_at,
    updated_at: transformedMember.updated_at,
    deleted_at: transformedMember.deleted_at,
    sessions: await ArrayUtil.asyncMap(
      transformedMember.sessions ?? [],
      (session) =>
        HrmPlatformMemberSessionAtSummaryTransformer.transform(session as any),
    ),
    passwordResetTokens: await ArrayUtil.asyncMap(
      transformedMember.passwordResetTokens ?? [],
      (token) =>
        HrmPlatformMemberPasswordResetAtSummaryTransformer.transform(
          token as any,
        ),
    ),
    emailVerifications: await ArrayUtil.asyncMap(
      transformedMember.emailVerifications ?? [],
      (verification) =>
        HrmPlatformMemberEmailVerificationAtSummaryTransformer.transform(
          verification as any,
        ),
    ),
    member: transformedMember,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
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
// export async function postHrmPlatformAuthMemberRefresh(props: {
//   body: IHrmPlatformMember.IRefresh;
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