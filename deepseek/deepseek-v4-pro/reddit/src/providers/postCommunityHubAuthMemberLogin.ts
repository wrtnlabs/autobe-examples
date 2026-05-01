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

export async function postCommunityHubAuthMemberLogin(props: {
  ip: string;
  body: ICommunityHubMember.ILogin;
}): Promise<ICommunityHubMember.IAuthorized> {
  // 1. Find member by email with password_hash for verification
  const memberSelect = CommunityHubMemberTransformer.select().select;
  const member = await MyGlobal.prisma.community_hub_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...memberSelect,
      email: true,
      password_hash: true,
      deleted_at: true,
    },
  });
  // 2. No account found for that email
  if (!member) {
    throw new HttpException("No account found for that email", 404);
  }
  // 3. Account has been soft-deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Incorrect password", 401);
  }
  // 5. Create new session and generate JWT tokens
  const now = Date.now();
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires = new Date(now + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date(now).toISOString();
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.community_hub_member_sessions.create({
    data: {
      id: sessionId,
      member: { connect: { id: member.id } },
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAt,
      expired_at: refreshExpires,
    },
  });
  // 6. Build token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 7. Transform member and return IAuthorized
  const transformed = await CommunityHubMemberTransformer.transform(member);
  return {
    ...transformed,
    token,
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
// export async function postCommunityHubAuthMemberLogin(props: {
//   ip: string;
//   body: ICommunityHubMember.ILogin;
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