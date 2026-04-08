import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberFeedsCommunityCommunityName(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page: number = 1;
  const limit: number = 20;
  const skip: number = (page - 1) * limit;
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const bannedUsers =
    await MyGlobal.prisma.reddit_platform_banned_users.findMany({
      where: {
        community_id: community.id,
        deleted_at: null,
      },
      select: {
        user_id: true,
      },
    });
  const bannedUserIds: string[] = bannedUsers.map((ban) => ban.user_id);
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    community_id: community.id,
    deleted_at: null,
    author_id: bannedUserIds.length > 0 ? { notIn: bannedUserIds } : undefined,
  } satisfies Prisma.reddit_platform_postsWhereInput;
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput[] = [
    { created_at: "desc" },
  ];
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip: skip,
      take: limit,
      ...RedditPlatformPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_posts.count({ where: whereInput }),
  ]);
  const transformedPosts: IRedditPlatformPost.ISummary[] =
    await ArrayUtil.asyncMap(
      posts,
      RedditPlatformPostAtSummaryTransformer.transform,
    );
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: pages,
  } satisfies IPage.IPagination;
  const result: IPageIRedditPlatformPost.ISummary = {
    pagination: pagination,
    data: transformedPosts,
  } satisfies IPageIRedditPlatformPost.ISummary;
  return result;
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
// import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberFeedsCommunityCommunityName(props: {
//   member: MemberPayload;
//   communityName: string;
// }): Promise<IPageIRedditPlatformPost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_posts.findMany({
//     ...RedditPlatformPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------