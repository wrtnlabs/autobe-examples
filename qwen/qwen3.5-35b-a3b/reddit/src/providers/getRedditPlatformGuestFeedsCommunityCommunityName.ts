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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformGuestFeedsCommunityCommunityName(props: {
  guest: GuestPayload;
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
      select: { id: true },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const bannedUserIds = await MyGlobal.prisma.reddit_platform_banned_users
    .findMany({
      where: {
        community_id: community.id,
        deleted_at: null,
      },
      select: { user_id: true },
    })
    .then((bans) => bans.map((b) => b.user_id));
  const whereClause: Prisma.reddit_platform_postsWhereInput = {
    community_id: community.id,
    deleted_at: null,
  };
  if (bannedUserIds.length > 0) {
    whereClause.author_id = { notIn: bannedUserIds };
  }
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    ...RedditPlatformPostAtSummaryTransformer.select(),
    where: whereClause,
    skip,
    take: limit,
    orderBy: [{ upvotes_count: "desc" }, { created_at: "desc" }],
  });
  const total: number = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      posts,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformPost.ISummary;
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
// export async function getRedditPlatformGuestFeedsCommunityCommunityName(props: {
//   guest: GuestPayload;
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