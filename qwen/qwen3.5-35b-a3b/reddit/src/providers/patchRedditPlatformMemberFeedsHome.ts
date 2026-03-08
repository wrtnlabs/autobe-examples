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

export async function patchRedditPlatformMemberFeedsHome(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
      subscriptions: {
        some: {
          reddit_platform_member_id: props.member.id,
          deleted_at: null,
        },
      },
      bans: {
        none: {
          deleted_at: null,
        },
      },
    },
  };
  if (props.body.search !== undefined && props.body.search !== null) {
    whereInput.title = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  if (props.body.post_type !== undefined) {
    whereInput.post_type = props.body.post_type;
  }
  if (props.body.community_id !== undefined) {
    whereInput.reddit_platform_community_id = props.body.community_id;
  }
  if (props.body.start_date !== undefined) {
    whereInput.created_at = {
      gte: toISOStringSafe(props.body.start_date),
    };
  }
  if (props.body.end_date !== undefined) {
    const endValue = toISOStringSafe(props.body.end_date);
    if (whereInput.created_at) {
      if (typeof whereInput.created_at === "object") {
        whereInput.created_at = {
          ...whereInput.created_at,
          lte: endValue,
        };
      } else {
        whereInput.created_at = {
          gte: whereInput.created_at,
          lte: endValue,
        };
      }
    } else {
      whereInput.created_at = {
        lte: endValue,
      };
    }
  }
  const orderByInput = (() => {
    switch (props.body.sort_type ?? "NEW") {
      case "NEW":
        return { created_at: "desc" as const };
      case "TOP": {
        if (props.body.time_range === "TODAY") {
          return {
            vote_score: "desc" as const,
            created_at: "desc" as const,
          };
        }
        if (props.body.time_range === "WEEK") {
          return {
            vote_score: "desc" as const,
            created_at: "desc" as const,
          };
        }
        if (props.body.time_range === "MONTH") {
          return {
            vote_score: "desc" as const,
            created_at: "desc" as const,
          };
        }
        if (props.body.time_range === "YEAR") {
          return {
            vote_score: "desc" as const,
            created_at: "desc" as const,
          };
        }
        return { vote_score: "desc" as const };
      }
      case "HOT":
        return { vote_score: "desc" as const, created_at: "desc" as const };
      case "CONTROVERSIAL":
        return { vote_score: "asc" as const, created_at: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })();
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
