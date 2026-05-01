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
import { CommunityHubCommentTransformer } from "../transformers/CommunityHubCommentTransformer";
import { CommunityHubPostAtSummaryTransformer } from "../transformers/CommunityHubPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubAuthMemberRefresh(props: {
  body: ICommunityHubMember.IRefresh;
}): Promise<ICommunityHubMember.IAuthorized> {
  const session = await MyGlobal.prisma.community_hub_member_sessions.findFirst(
    {
      where: { refresh_token: props.body.refresh_token },
    },
  );
  if (!session) {
    throw new HttpException("Invalid or already rotated refresh token", 401);
  }
  if (session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session expired", 401);
  }
  const member = await MyGlobal.prisma.community_hub_members.findUniqueOrThrow({
    where: { id: session.community_hub_member_id },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_uri: true,
      karma: true,
      created_at: true,
      deleted_at: true,
      posts: {
        where: { deleted_at: null },
        ...CommunityHubPostAtSummaryTransformer.select(),
      },
      comments: {
        where: { deleted_at: null },
        ...CommunityHubCommentTransformer.select(),
      },
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowEpoch = Date.now();
  const oneHourMs = 3600000;
  const sevenDaysMs = 604800000;
  const accessExpiresStr = new Date(nowEpoch + oneHourMs).toISOString();
  const refreshExpiresStr = new Date(nowEpoch + sevenDaysMs).toISOString();
  const nowStr = new Date(nowEpoch).toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: nowStr,
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
        created_at: nowStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresStr,
    refreshable_until: refreshExpiresStr,
  };
  await MyGlobal.prisma.community_hub_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
      expired_at: new Date(nowEpoch + sevenDaysMs),
    },
  });
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar_uri: member.avatar_uri,
    karma: member.karma,
    created_at: member.created_at.toISOString(),
    posts: await ArrayUtil.asyncMap(member.posts, (r) =>
      CommunityHubPostAtSummaryTransformer.transform(r),
    ),
    comments: await ArrayUtil.asyncMap(member.comments, (r) =>
      CommunityHubCommentTransformer.transform(r),
    ),
    token,
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
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubAuthMemberRefresh(props: {
//   body: ICommunityHubMember.IRefresh;
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