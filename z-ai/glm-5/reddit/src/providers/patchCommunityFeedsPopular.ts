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

export async function patchCommunityFeedsPopular(props: {
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (props.body.limit ?? 25) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const time = props.body.time ?? "all";
  // Build WHERE clause
  let whereInput: Prisma.community_postsWhereInput = {
    is_deleted: false,
    deleted_at: null,
    community: {
      deleted_at: null,
    },
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { text_content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.authorId && { author_id: props.body.authorId }),
    ...(props.body.postType && { post_type: props.body.postType }),
  };
  // Apply time filter for 'top' sorting
  if (sort === "top" && time !== "all") {
    const now = new Date();
    let threshold: Date;
    switch (time) {
      case "today":
        threshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        threshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        threshold = new Date(0);
    }
    whereInput.created_at = { gte: threshold };
  }
  // Build ORDER BY clause
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
  // Query posts with pagination
  const posts = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPostAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.community_posts.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    posts,
    CommunityPostAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
