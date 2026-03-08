import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityAtSummaryTransformer } from "../transformers/RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberFeedPopular(props: {
  member: MemberPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.sort === "top" && props.body.time) {
    const now = new Date();
    let startTime = new Date(0);
    switch (props.body.time) {
      case "today":
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startTime = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate(),
        );
        break;
      case "year":
        startTime = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
        break;
      case "all":
        startTime = new Date(0);
        break;
    }
    whereConditions.created_at = {
      gte: startTime,
    };
  }
  const orderBy: Prisma.reddit_like_postsOrderByWithRelationInput[] = [];
  if (props.body.sort === "new") {
    orderBy.push({ created_at: "desc" });
  } else if (props.body.sort === "top") {
    orderBy.push({ score: "desc" });
    orderBy.push({ created_at: "desc" });
  } else if (props.body.sort === "hot") {
    orderBy.push({ score: "desc" });
    orderBy.push({ created_at: "desc" });
  } else if (props.body.sort === "controversial") {
    orderBy.push({ score: "desc" });
    orderBy.push({ created_at: "desc" });
  } else {
    orderBy.push({ created_at: "desc" });
  }
  const data = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      content: true,
      score: true,
      comment_count: true,
      created_at: true,
      author: { select: { id: true, created_at: true } },
      community: {
        select: { id: true, name: true, icon_url: true, created_at: true },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereConditions,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (post) => ({
      id: post.id,
      title: post.title,
      content: post.content ?? "",
      score: post.score,
      hit_count: 0,
      comment_count: post.comment_count,
      created_at: toISOStringSafe(post.created_at),
      author: await RedditLikeMemberAtSummaryTransformer.transform(post.author),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        post.community,
      ),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
