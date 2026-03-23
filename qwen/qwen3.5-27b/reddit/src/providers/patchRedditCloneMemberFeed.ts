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

export async function patchRedditCloneMemberFeed(props: {
  member: MemberPayload;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.page_size ?? 20;
  const skip = (page - 1) * pageSize;
  const feedType = props.body.feed_type ?? "popular";
  const sort = props.body.sort ?? "hot";
  let whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
    },
  };
  if (feedType === "home") {
    whereInput = {
      ...whereInput,
    };
  } else if (feedType === "community") {
    if (!props.body.community_id) {
      throw new HttpException(
        "community_id is required for community feed",
        400,
      );
    }
    whereInput = {
      ...whereInput,
      reddit_clone_community_id: props.body.community_id,
    };
  }
  if (props.body.post_type) {
    whereInput = {
      ...whereInput,
      post_type: props.body.post_type,
    };
  }
  if (props.body.author_id) {
    whereInput = {
      ...whereInput,
      reddit_clone_members_id: props.body.author_id,
    };
  }
  if (props.body.created_at_from) {
    whereInput = {
      ...whereInput,
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    };
  }
  if (props.body.created_at_to) {
    whereInput = {
      ...whereInput,
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    };
  }
  if (props.body.search) {
    whereInput = {
      ...whereInput,
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { content: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  }
  if (sort === "top" && props.body.time_filter) {
    const now = new Date();
    let timeThreshold: Date | null = null;
    switch (props.body.time_filter) {
      case "today":
        timeThreshold = new Date();
        timeThreshold.setHours(0, 0, 0, 0);
        break;
      case "week":
        timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all_time":
        break;
    }
    if (timeThreshold) {
      whereInput = {
        ...whereInput,
        created_at: {
          gte: timeThreshold,
        },
      };
    }
  }
  let orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput;
  switch (sort) {
    case "new":
      orderByInput = { created_at: "desc" };
      break;
    case "top":
      orderByInput = { score: "desc" };
      break;
    case "controversial":
      orderByInput = { score: "asc" };
      break;
    case "hot":
    default:
      orderByInput = { created_at: "desc" };
      break;
  }
  const data = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: pageSize,
    orderBy: orderByInput,
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditClonePostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditClonePost.ISummary;
}
