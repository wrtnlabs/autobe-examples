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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberFeedPopular(props: {
  member: MemberPayload;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? (1 as const);
  const limit = Math.min(props.body.limit ?? (25 as const), 100 as const);
  const sort = props.body.sort ?? ("hot" as const);
  const timeRange = props.body.timeRange ?? ("all" as const);
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.type) {
    whereCondition.type = props.body.type;
  }
  if (sort === "top" || sort === "controversial") {
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        startDate = new Date("1970-01-01T00:00:00.000Z");
    }
    whereCondition.created_at = { gte: startDate };
  }
  const orderByInput = (
    sort === "new"
      ? { created_at: "desc" as const }
      : sort === "top"
        ? { vote_score: "desc" as const }
        : sort === "controversial"
          ? [{ vote_score: "asc" as const }, { created_at: "desc" as const }]
          : [{ vote_score: "desc" as const }, { created_at: "desc" as const }]
  ) as
    | Prisma.reddit_clone_postsOrderByWithRelationInput
    | Prisma.reddit_clone_postsOrderByWithRelationInput[];
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereCondition,
    skip: skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
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
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereCondition,
  });
  const data = records.map((record) => {
    let contentPreview = "";
    switch (record.type) {
      case "text":
        contentPreview = record.postTextContent?.body?.substring(0, 200) ?? "";
        break;
      case "image":
        contentPreview = record.image?.reddit_clone_file_id ?? "";
        break;
      case "link":
        try {
          contentPreview = record.link?.url
            ? new URL(record.link.url).hostname
            : "";
        } catch {
          contentPreview = record.link?.url ?? "";
        }
        break;
    }
    return {
      id: record.id,
      title: record.title,
      type: record.type as "text" | "link" | "image",
      voteScore: record.vote_score,
      commentCount: record.comment_count,
      createdAt: record.created_at.toISOString(),
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
        icon: record.community.icon?.file?.storage_path ?? undefined,
      } satisfies IRedditCloneCommunity.ISummary,
      contentPreview,
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
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberFeedPopular(props: {
//   member: MemberPayload;
//   body: IRedditClonePost.IRequest;
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