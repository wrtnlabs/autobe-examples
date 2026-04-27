import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberRefresh(props: {
  body: ICommunityPlatformMember.IRefresh;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // Compute SHA-256 hash of the raw refresh token using Web Crypto API
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(props.body.refresh),
  );
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Lookup session by refresh token hash (unique constraint)
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findUnique({
      where: { refresh_token_hash: hash },
    });
  if (session === null) {
    throw new HttpException("Invalid refresh token", 401);
  }
  // Check session expiration
  if (session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Refresh token has expired", 401);
  }
  // Fetch member with nested profile using the full member transformer
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: session.member_id },
      ...CommunityPlatformMemberTransformer.select(),
    });
  // Verify account is not soft-deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate new session UUID for token rotation
  const newSessionId = v4();
  // Compute timestamps
  const nowEpoch = Date.now();
  const accessExpiresEpoch = nowEpoch + 60 * 60 * 1000;
  const refreshExpiresEpoch = nowEpoch + 7 * 24 * 60 * 60 * 1000;
  // ISO strings for all datetime representations
  const nowISO = new Date(nowEpoch).toISOString();
  const accessExpiresISO = new Date(accessExpiresEpoch).toISOString();
  const refreshExpiresISO = new Date(refreshExpiresEpoch).toISOString();
  // Generate new JWT access token (1 hour)
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: newSessionId,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // Generate new JWT refresh token (7 days)
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Compute SHA-256 hash of the new refresh token using Web Crypto API
  const newHashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(newRefreshToken),
  );
  const newRefreshHash = Array.from(new Uint8Array(newHashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Delete old session (token rotation — invalidate old refresh token)
  await MyGlobal.prisma.community_platform_member_sessions.delete({
    where: { id: session.id },
  });
  // Create new session with rotated token and preserved metadata
  await MyGlobal.prisma.community_platform_member_sessions.create({
    data: {
      id: newSessionId,
      member_id: member.id,
      refresh_token_hash: newRefreshHash,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: nowISO,
      updated_at: nowISO,
      expired_at: refreshExpiresISO,
    },
  });
  // Transform member with profile using the transformer
  const transformed =
    await CommunityPlatformMemberTransformer.transform(member);
  return {
    id: transformed.id,
    email: transformed.email,
    username: transformed.username,
    profile: transformed.profile,
    created_at: transformed.created_at,
    updated_at: transformed.updated_at,
    deleted_at: transformed.deleted_at,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    } satisfies IAuthorizationToken,
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
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformAuthMemberRefresh(props: {
//   body: ICommunityPlatformMember.IRefresh;
// }): Promise<ICommunityPlatformMember.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     username: ...,
//     profile: await CommunityPlatformProfileTransformer.transform(...),
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------