import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostAtSummaryTransformer } from "../transformers/CommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  // 1. Validate community exists and is not deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Parse pagination params
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "hot";
  const nowMs = Date.now();
  // 3. Build created_at filter for 'top' sort time range
  const msPerDay = 24 * 60 * 60 * 1000;
  const topTimeRangeGte: Date | null =
    sort === "top"
      ? (() => {
          const timeRange = props.body.timeRange ?? "all_time";
          if (timeRange === "today") return new Date(nowMs - msPerDay);
          if (timeRange === "this_week") return new Date(nowMs - 7 * msPerDay);
          if (timeRange === "this_month")
            return new Date(nowMs - 30 * msPerDay);
          if (timeRange === "this_year")
            return new Date(nowMs - 365 * msPerDay);
          return null; // all_time
        })()
      : null;
  // Compute created_at boundaries
  const createdAtGteFromBody =
    props.body.createdAtFrom != null
      ? new Date(props.body.createdAtFrom)
      : null;
  const createdAtLteFromBody =
    props.body.createdAtTo != null ? new Date(props.body.createdAtTo) : null;
  // Merge top time range filter with explicit body date filters
  const gteDate: Date | null =
    topTimeRangeGte != null && createdAtGteFromBody != null
      ? topTimeRangeGte > createdAtGteFromBody
        ? topTimeRangeGte
        : createdAtGteFromBody
      : (topTimeRangeGte ?? createdAtGteFromBody);
  const lteDate: Date | null = createdAtLteFromBody;
  const createdAtClause =
    gteDate != null || lteDate != null
      ? {
          ...(gteDate != null && { gte: gteDate }),
          ...(lteDate != null && { lte: lteDate }),
        }
      : undefined;
  // 4. Build WHERE clause
  const whereInput = {
    community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.keyword != null && {
      title: { contains: props.body.keyword, mode: "insensitive" as const },
    }),
    ...(props.body.type != null && { type: props.body.type }),
    ...(createdAtClause != null && { created_at: createdAtClause }),
  } satisfies Prisma.community_postsWhereInput;
  // 5. For 'new' sort: use efficient DB-level pagination
  if (sort === "new") {
    const skip = (page - 1) * limit;
    const rawPosts = await MyGlobal.prisma.community_posts.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...CommunityPostAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.community_posts.count({
      where: whereInput,
    });
    const data = await ArrayUtil.asyncMap(
      rawPosts,
      CommunityPostAtSummaryTransformer.transform,
    );
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data,
    };
  }
  // 6. For 'hot', 'top', 'controversial': fetch all matching posts, sort in memory
  const allPosts = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    ...CommunityPostAtSummaryTransformer.select(),
  });
  const total = allPosts.length;
  // Compute score for each post
  const scored = allPosts.map((post) => {
    const upvotes = post.votes.filter((v) => v.vote_type === "upvote").length;
    const downvotes = post.votes.filter(
      (v) => v.vote_type === "downvote",
    ).length;
    const netScore = upvotes - downvotes;
    const totalVotes = upvotes + downvotes;
    let score: number;
    if (sort === "hot") {
      const ageHours = (nowMs - post.created_at.getTime()) / (1000 * 60 * 60);
      score = netScore / Math.pow(ageHours + 2, 1.5);
    } else if (sort === "top") {
      score = netScore;
    } else {
      // controversial: high total votes * closeness to 50/50 split
      const balance =
        totalVotes > 0 ? 1 - Math.abs(upvotes / totalVotes - 0.5) * 2 : 0;
      score = totalVotes * balance;
    }
    return { post, score };
  });
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  // Paginate in memory
  const skip = (page - 1) * limit;
  const pagePosts = scored.slice(skip, skip + limit).map((s) => s.post);
  const data = await ArrayUtil.asyncMap(
    pagePosts,
    CommunityPostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
