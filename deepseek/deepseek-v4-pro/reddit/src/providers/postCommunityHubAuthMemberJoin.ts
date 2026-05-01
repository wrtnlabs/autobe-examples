import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubMemberTransformer } from "../transformers/CommunityHubMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubAuthMemberJoin(props: {
  ip: string;
  body: ICommunityHubMember.IJoin;
}): Promise<ICommunityHubMember.IAuthorized> {
  // Check duplicate username
  const existingUsername =
    await MyGlobal.prisma.community_hub_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // Check duplicate email
  const existingEmail = await MyGlobal.prisma.community_hub_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create member
  const memberId = v4();
  const now = new Date().toISOString();
  const member = await MyGlobal.prisma.community_hub_members.create({
    data: {
      id: memberId,
      username: props.body.username,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.username,
      karma: 0,
      created_at: now,
      updated_at: now,
    },
    ...CommunityHubMemberTransformer.select(),
  });
  // Generate session and tokens
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
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
  // Create session
  await MyGlobal.prisma.community_hub_member_sessions.create({
    data: {
      id: sessionId,
      community_hub_member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // Return IAuthorized
  const transformed = await CommunityHubMemberTransformer.transform(member);
  return {
    ...transformed,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ICommunityHubMember.IAuthorized;
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
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubAuthMemberJoin(props: {
//   ip: string;
//   body: ICommunityHubMember.IJoin;
// }): Promise<ICommunityHubMember.IAuthorized> {
//   return {
//     id: ...,
//     username: ...,
//     display_name: ...,
//     bio: ...,
//     avatar_uri: ...,
//     karma: ...,
//     created_at: ...,
//     posts: await ArrayUtil.asyncMap(..., (r) => CommunityHubPostAtSummaryTransformer.transform(r)),
//     comments: await ArrayUtil.asyncMap(..., (r) => CommunityHubCommentTransformer.transform(r)),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------