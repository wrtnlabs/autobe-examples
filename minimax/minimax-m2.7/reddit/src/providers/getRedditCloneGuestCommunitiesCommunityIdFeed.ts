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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneGuestCommunitiesCommunityIdFeed(props: {
  guest: GuestPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditClonePost.ISummary> {
  const limit = 20;
  const page = 1;
  const skip = (page - 1) * limit;
  // Verify community exists and is not soft-deleted
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
    select: { id: true },
  });
  // Build where clause for posts in this community
  const whereClause: Prisma.reddit_clone_postsWhereInput = {
    reddit_clone_community_id: props.communityId,
    deleted_at: null,
  };
  // Get posts with proper select structure
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
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
              file: {
                select: {
                  storage_path: true,
                },
              },
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
    },
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereClause,
  });
  // Transform records to response DTO
  const data = await ArrayUtil.asyncMap(records, async (record) => {
    return {
      id: record.id,
      title: record.title,
      type: record.type as "text" | "link" | "image",
      voteScore: record.vote_score,
      commentCount: record.comment_count,
      createdAt: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
      author: {
        id: record.author.id,
        username: record.author.username,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: record.community.id,
        name: record.community.name,
        description: record.community.description,
        subscriberCount: record.community.subscriber_count,
        owner: {
          id: record.community.member.id,
          username: record.community.member.username,
        } satisfies IRedditCloneMember.ISummary,
        icon: record.community.icon?.file?.storage_path ?? null,
      } satisfies IRedditCloneCommunity.ISummary,
      contentPreview: getContentPreview(record),
    } satisfies IRedditClonePost.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
function getContentPreview(record: {
  type: string;
  postTextContent: {
    body: string;
  } | null;
  link: {
    url: string;
  } | null;
  image: {
    reddit_clone_file_id: string;
  } | null;
}): string {
  switch (record.type) {
    case "text":
      return record.postTextContent?.body?.substring(0, 200) ?? "";
    case "image":
      return record.image?.reddit_clone_file_id ?? "";
    case "link":
      try {
        return record.link?.url ? new URL(record.link.url).hostname : "";
      } catch {
        return record.link?.url ?? "";
      }
    default:
      return "";
  }
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
// export async function getRedditCloneGuestCommunitiesCommunityIdFeed(props: {
//   guest: GuestPayload;
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