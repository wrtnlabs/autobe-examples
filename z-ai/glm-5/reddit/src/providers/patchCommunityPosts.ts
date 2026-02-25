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

export async function patchCommunityPosts(props: {
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.max(10, Math.min(100, props.body.limit ?? 25));
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    is_deleted: false,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { text_content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.authorId && { author_id: props.body.authorId }),
    ...(props.body.postType && { post_type: props.body.postType }),
    ...(props.body.sort === "top" &&
      props.body.time &&
      props.body.time !== "all" && {
        created_at: {
          gte: new Date(Date.now() - getTimeFilterMillis(props.body.time)),
        },
      }),
  } satisfies Prisma.community_postsWhereInput;
  // Determine sort order
  const sort = props.body.sort ?? "hot";
  const orderByInput = (
    sort === "hot"
      ? { hot_score: "desc" }
      : sort === "new"
        ? { created_at: "desc" }
        : sort === "top"
          ? { vote_score: "desc" }
          : sort === "controversial"
            ? { controversy_score: "desc" }
            : { hot_score: "desc" }
  ) satisfies Prisma.community_postsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
function getTimeFilterMillis(time: string): number {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  switch (time) {
    case "today":
      return 24 * HOUR;
    case "week":
      return 7 * DAY;
    case "month":
      return 30 * DAY;
    case "year":
      return 365 * DAY;
    default:
      return 0;
  }
}
