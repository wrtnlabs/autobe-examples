import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberFeedHome(props: {
  member: MemberPayload;
}): Promise<IPageIRedditClonePost.ISummary> {
  // Get user's subscribed community IDs
  const subscriptions =
    await MyGlobal.prisma.reddit_clone_subscriptions.findMany({
      where: {
        reddit_clone_member_id: props.member.id,
      },
      select: {
        reddit_clone_community_id: true,
      },
    });
  const communityIds = subscriptions.map((s) => s.reddit_clone_community_id);
  // Pagination setup (1-indexed per IPage.IPagination spec)
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Build where clause - handle empty subscriptions case (return no posts)
  const whereClause =
    communityIds.length > 0
      ? {
          reddit_clone_community_id: { in: communityIds },
          deleted_at: null,
        }
      : {
          reddit_clone_community_id: { in: [] as string[] },
          deleted_at: null,
        };
  // Query posts with proper Prisma include for relations
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: [{ vote_score: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      title: true,
      type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          subscriber_count: true,
          member: {
            select: {
              id: true,
              username: true,
            },
          },
          icon: {
            select: {
              file: true,
            },
          },
        },
      },
      postTextContent: {
        select: {
          body: true,
        },
      },
      link: {
        select: {
          url: true,
        },
      },
      image: {
        select: {
          reddit_clone_file_id: true,
        },
      },
      comments: true,
      postVotes: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditClonePostAtSummaryTransformer.transform,
    ),
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
// import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneMemberFeedHome(props: {
//   member: MemberPayload;
// }): Promise<IPageIRedditClonePost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
//     ...RedditClonePostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditClonePostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------