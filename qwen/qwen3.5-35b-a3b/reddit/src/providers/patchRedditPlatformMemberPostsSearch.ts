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

export async function patchRedditPlatformMemberPostsSearch(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  if (
    props.body.dateRange !== undefined &&
    props.body.dateRange.startDate > props.body.dateRange.endDate
  ) {
    throw new HttpException(
      "Start date must be before or equal to end date",
      400,
    );
  }
  const authorSearch =
    props.body.authorId !== undefined
      ? {
          reddit_platform_member_id: props.body.authorId,
        }
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.communityId !== undefined && {
      reddit_platform_community_id: props.body.communityId,
    }),
    ...(authorSearch !== undefined && authorSearch),
    ...(props.body.postType !== undefined && {
      post_type: props.body.postType.toUpperCase() as "TEXT" | "LINK" | "IMAGE",
    }),
    ...(props.body.excludeTypes !== undefined && {
      NOT: {
        post_type: {
          in: props.body.excludeTypes.map(
            (t) => t.toUpperCase() as "TEXT" | "LINK" | "IMAGE",
          ),
        },
      },
    }),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            {
              title: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(props.body.dateRange !== undefined && {
      created_at: {
        gte: props.body.dateRange.startDate,
        lte: props.body.dateRange.endDate,
      },
    }),
    ...(props.body.voteScoreRange !== undefined && {
      vote_score: {
        gte: props.body.voteScoreRange.min,
        lte: props.body.voteScoreRange.max,
      },
    }),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  const orderByInput = (() => {
    if (props.body.sortBy === "top") {
      return {
        vote_score:
          props.body.sortDirection !== undefined
            ? props.body.sortDirection === "asc"
              ? "asc"
              : "desc"
            : "desc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
    } else if (props.body.sortBy === "new") {
      return {
        created_at:
          props.body.sortDirection !== undefined
            ? props.body.sortDirection === "asc"
              ? "asc"
              : "desc"
            : "desc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
    } else if (props.body.sortBy === "controversial") {
      return {
        vote_score: "asc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
    } else {
      return {
        created_at: "desc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
    }
  })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_posts.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
