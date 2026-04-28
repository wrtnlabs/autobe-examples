import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityAuthMemberJoin(props: {
  ip: string;
  body: IREdditLikeCommunityMember.IJoin;
}): Promise<IREdditLikeCommunityMember.IAuthorized> {
  // 1. Check for existing active account with same email OR username
  const existing =
    await MyGlobal.prisma.reddit_like_community_members.findFirst({
      where: {
        OR: [{ email: props.body.email }, { username: props.body.username }],
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("Email or username already registered", 409);
  }
  // 2. Hash password using PasswordUtil
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Prepare timestamps and IDs
  const memberId = v4();
  const profileId = v4();
  const sessionId = v4();
  const memberCreatedAt = new Date();
  const sessionExpiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 3. Create member record
  await MyGlobal.prisma.reddit_like_community_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      created_at: memberCreatedAt,
      updated_at: memberCreatedAt,
      deleted_at: null,
    },
  });
  // 4. Create associated profile (1:1 relationship, default karma=0)
  const profileCreatedAt = new Date();
  await MyGlobal.prisma.reddit_like_community_profiles.create({
    data: {
      id: profileId,
      reddit_like_community_member_id: memberId,
      display_name: null,
      bio: null,
      karma: 0,
      created_at: profileCreatedAt,
      updated_at: profileCreatedAt,
      deleted_at: null,
    },
  });
  // 5. Create session record
  const sessionCreatedAt = new Date();
  await MyGlobal.prisma.reddit_like_community_member_sessions.create({
    data: {
      id: sessionId,
      member: { connect: { id: memberId } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: sessionCreatedAt,
      expired_at: sessionExpiredAt,
    },
  });
  // 6. Generate JWT tokens (access=1h, refresh=7d)
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(sessionExpiredAt);
  const tokenCreated = toISOStringSafe(new Date());
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        created_at: tokenCreated,
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
        created_at: tokenCreated,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };
  // 7. Return IAuthorized with member data + profile fields + token
  const memberCreated = toISOStringSafe(memberCreatedAt);
  return {
    id: memberId,
    username: props.body.username,
    email: props.body.email,
    display_name: null,
    bio: null,
    karma: 0,
    created_at: memberCreated,
    updated_at: memberCreated,
    deleted_at: null,
    token,
  } satisfies IREdditLikeCommunityMember.IAuthorized;
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
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityAuthMemberJoin(props: {
//   ip: string;
//   body: IREdditLikeCommunityMember.IJoin;
// }): Promise<IREdditLikeCommunityMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------