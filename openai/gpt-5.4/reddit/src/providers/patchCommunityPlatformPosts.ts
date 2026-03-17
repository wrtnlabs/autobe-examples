import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPosts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const sort = props.body.sort ?? "new";
  const topPeriod = props.body.top_period ?? "all";
  const topPeriodFrom =
    sort === "top"
      ? (() => {
          if (topPeriod === "all") return undefined;
          const now = Date.now();
          const day = 24 * 60 * 60 * 1000;
          if (topPeriod === "today") return new Date(now - day);
          if (topPeriod === "week") return new Date(now - 7 * day);
          if (topPeriod === "month") return new Date(now - 30 * day);
          return new Date(now - 365 * day);
        })()
      : undefined;
  const whereInput = {
    deleted_at: null,
    status: props.body.status ?? "active",
    community: {
      deleted_at: null,
      status: "active",
      ...(props.body.community_slug !== undefined
        ? { slug: props.body.community_slug }
        : {}),
    },
    ...(props.body.author_code !== undefined
      ? {
          author: {
            code: props.body.author_code,
          },
        }
      : {}),
    ...(props.body.post_type !== undefined
      ? {
          post_type: props.body.post_type,
        }
      : {}),
    ...(props.body.created_from !== undefined ||
    props.body.created_to !== undefined ||
    topPeriodFrom !== undefined
      ? {
          created_at: {
            ...(props.body.created_from !== undefined
              ? { gte: new Date(props.body.created_from) }
              : {}),
            ...(props.body.created_to !== undefined
              ? { lte: new Date(props.body.created_to) }
              : {}),
            ...(topPeriodFrom !== undefined ? { gte: topPeriodFrom } : {}),
          },
        }
      : {}),
    ...(props.body.updated_from !== undefined ||
    props.body.updated_to !== undefined
      ? {
          updated_at: {
            ...(props.body.updated_from !== undefined
              ? { gte: new Date(props.body.updated_from) }
              : {}),
            ...(props.body.updated_to !== undefined
              ? { lte: new Date(props.body.updated_to) }
              : {}),
          },
        }
      : {}),
    ...(search !== undefined && search.length !== 0
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              community: {
                OR: [
                  {
                    title: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
            {
              author: {
                profile: {
                  is: {
                    display_name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
            {
              textContent: {
                is: {
                  body: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              link: {
                is: {
                  domain_display: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.community_platform_postsWhereInput;
  if (sort === "new" || sort === "hot") {
    const data = await MyGlobal.prisma.community_platform_posts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.community_platform_posts.count({
      where: whereInput,
    });
    return {
      data: await ArrayUtil.asyncMap(
        data,
        CommunityPlatformPostAtSummaryTransformer.transform,
      ),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
  const ranked = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  const scored = ranked.map((post) => {
    const upvotes = post.votes.filter(
      (vote) => vote.deleted_at === null && vote.direction === "upvote",
    ).length;
    const downvotes = post.votes.filter(
      (vote) => vote.deleted_at === null && vote.direction === "downvote",
    ).length;
    return {
      post,
      score: upvotes - downvotes,
      controversy: Math.min(upvotes, downvotes),
    };
  });
  const sorted = scored.sort((left, right) => {
    if (sort === "top") {
      if (right.score !== left.score) return right.score - left.score;
    } else {
      if (right.controversy !== left.controversy) {
        return right.controversy - left.controversy;
      }
    }
    const createdAtDiff =
      right.post.created_at.getTime() - left.post.created_at.getTime();
    if (createdAtDiff !== 0) return createdAtDiff;
    return right.post.id.localeCompare(left.post.id);
  });
  const paged = sorted.slice(skip, skip + limit).map((entry) => entry.post);
  return {
    data: await ArrayUtil.asyncMap(
      paged,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: sorted.length,
      pages: Math.ceil(sorted.length / limit),
    } satisfies IPage.IPagination,
  };
}
