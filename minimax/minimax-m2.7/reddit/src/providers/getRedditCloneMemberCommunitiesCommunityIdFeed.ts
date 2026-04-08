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

export async function getRedditCloneMemberCommunitiesCommunityIdFeed(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Verify community exists and is not soft-deleted
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
    select: { id: true, deleted_at: true },
  });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Build WHERE clause for posts
  const where: Prisma.reddit_clone_postsWhereInput = {
    reddit_clone_community_id: props.communityId,
    deleted_at: null,
  };
  // Fetch posts with all relations needed for hot score calculation and transformation
  const allPosts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
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
  // Calculate hot score for each post and sort
  const hotSortedPosts = calculateHotScore(allPosts);
  // Apply pagination
  const paginatedPosts = hotSortedPosts.slice(skip, skip + limit);
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_posts.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      paginatedPosts,
      RedditClonePostAtSummaryTransformer.transform,
    ),
  };
}
function calculateHotScore(
  posts: RedditClonePostAtSummaryTransformer.Payload[],
): RedditClonePostAtSummaryTransformer.Payload[] {
  return posts.slice().sort((a, b) => {
    const aAgeHours = getHoursAge(a.created_at);
    const bAgeHours = getHoursAge(b.created_at);
    const aScore = a.vote_score / Math.pow(aAgeHours + 2, 1.5);
    const bScore = b.vote_score / Math.pow(bAgeHours + 2, 1.5);
    return bScore - aScore;
  });
}
function getHoursAge(createdAt: Date): number {
  const now = new Date();
  const nowMs = now.getTime();
  const createdMs = createdAt.getTime();
  const diffMs = nowMs - createdMs;
  return diffMs / (1000 * 60 * 60);
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
// export async function getRedditCloneMemberCommunitiesCommunityIdFeed(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
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