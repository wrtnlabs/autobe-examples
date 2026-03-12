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

export async function patchRedditCloneMemberPosts(props: {
  member: MemberPayload;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const page_size = props.body.page_size ?? 20;
  const limit = Math.min(Math.max(page_size, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.feed_type === "community") {
    if (!props.body.community_id) {
      throw new HttpException(
        "community_id is required for community feed",
        400,
      );
    }
    const community = await MyGlobal.prisma.reddit_clone_communities.findUnique(
      {
        where: {
          id: props.body.community_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
    );
    if (!community) {
      throw new HttpException("Community not found", 404);
    }
    whereInput.reddit_clone_community_id = props.body.community_id;
  }
  if (props.body.post_type) {
    whereInput.post_type = props.body.post_type;
  }
  if (props.body.author_id) {
    whereInput.reddit_clone_members_id = props.body.author_id;
  }
  const created_atFilter: Prisma.DateTimeFilter = {};
  if (props.body.created_at_from) {
    created_atFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to) {
    created_atFilter.lte = new Date(props.body.created_at_to);
  }
  if (props.body.time_filter && props.body.sort === "top") {
    const now = new Date();
    switch (props.body.time_filter) {
      case "today": {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        if (created_atFilter.gte instanceof Date) {
          created_atFilter.gte = new Date(
            Math.max(created_atFilter.gte.getTime(), startOfDay.getTime()),
          );
        } else {
          created_atFilter.gte = startOfDay;
        }
        break;
      }
      case "week": {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (created_atFilter.gte instanceof Date) {
          created_atFilter.gte = new Date(
            Math.max(created_atFilter.gte.getTime(), weekAgo.getTime()),
          );
        } else {
          created_atFilter.gte = weekAgo;
        }
        break;
      }
      case "month": {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (created_atFilter.gte instanceof Date) {
          created_atFilter.gte = new Date(
            Math.max(created_atFilter.gte.getTime(), monthAgo.getTime()),
          );
        } else {
          created_atFilter.gte = monthAgo;
        }
        break;
      }
      case "year": {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        if (created_atFilter.gte instanceof Date) {
          created_atFilter.gte = new Date(
            Math.max(created_atFilter.gte.getTime(), yearAgo.getTime()),
          );
        } else {
          created_atFilter.gte = yearAgo;
        }
        break;
      }
      case "all_time":
        break;
    }
  }
  if (Object.keys(created_atFilter).length > 0) {
    whereInput.created_at = created_atFilter;
  }
  if (props.body.search) {
    whereInput.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_posts.findMany({
      where: whereInput,
      skip,
      take: limit,
      ...RedditClonePostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_clone_posts.count({
      where: whereInput,
    }),
  ]);
  const sortedData = [...data];
  if (props.body.sort === "hot") {
    sortedData.sort((a, b) => {
      const now = Date.now();
      const ageHoursA =
        (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
      const ageHoursB =
        (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60);
      const scoreA = a.score / Math.pow(Math.max(ageHoursA, 0.001) + 2, 1.8);
      const scoreB = b.score / Math.pow(Math.max(ageHoursB, 0.001) + 2, 1.8);
      return scoreB - scoreA;
    });
  } else if (props.body.sort === "new") {
    sortedData.sort((a, b) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  } else if (props.body.sort === "top") {
    sortedData.sort((a, b) => b.score - a.score);
  } else if (props.body.sort === "controversial") {
    sortedData.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  }
  const transformed = await ArrayUtil.asyncMap(
    sortedData,
    RedditClonePostAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
