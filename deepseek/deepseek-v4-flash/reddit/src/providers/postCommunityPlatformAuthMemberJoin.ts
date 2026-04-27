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

export async function postCommunityPlatformAuthMemberJoin(props: {
  ip: string;
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // 1. Validate email uniqueness
  const existingEmail =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Validate username uniqueness
  const existingUsername =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername !== null) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Hash password using bcrypt via PasswordUtil
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  const now: string = new Date().toISOString();
  const memberId: string = v4();
  const sessionId: string = v4();
  // 4. Create member record in community_platform_members
  await MyGlobal.prisma.community_platform_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      username: props.body.username,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create profile record with karma=0, display_name defaults to the chosen username
  await MyGlobal.prisma.community_platform_profiles.create({
    data: {
      id: v4(),
      member_id: memberId,
      display_name: props.body.username,
      biography: null,
      avatar_uri: null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Generate JWT token pair (access: 1 hour, refresh: 7 days)
  const accessExpiresAt: string = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAt: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. SHA-256 hash the refresh token for secure session storage
  const { createHash } = await import("node:crypto");

  const refreshTokenHash: string = createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  // 8. Create initial authenticated session record
  await MyGlobal.prisma.community_platform_member_sessions.create({
    data: {
      id: sessionId,
      member_id: memberId,
      refresh_token_hash: refreshTokenHash,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      expired_at: refreshExpiresAt,
    },
  });
  // 9. Query the full member record via transformer for structured response
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: memberId },
      ...CommunityPlatformMemberTransformer.select(),
    });
  const transformed =
    await CommunityPlatformMemberTransformer.transform(member);
  // 10. Compose the IAuthorized response with member identity + JWT token pair
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
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
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
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformAuthMemberJoin(props: {
//   ip: string;
//   body: ICommunityPlatformMember.IJoin;
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