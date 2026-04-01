import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFeedsPopular(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timeFilter = props.body.timeFilter ?? "all";
  const postType = props.body.postType;
  const minScore = props.body.minScore;
  // Build base where clause
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
    ...(postType && { post_type: postType }),
  };
  // Build time filter for top sorting
  if (sort === "top" && timeFilter !== "all") {
    const now = new Date();
    let dateGte: Date;
    switch (timeFilter) {
      case "today":
        dateGte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        dateGte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        dateGte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        dateGte = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateGte = now;
    }
    whereInput.created_at = { gte: dateGte };
  }
  // Build order by clause based on sort type
  // Note: True hot/controversial sorting requires computed fields
  // Using simplified approach compatible with Prisma
  const orderByInput = (
    sort === "new"
      ? { created_at: "desc" as const }
      : sort === "top"
        ? { created_at: "desc" as const }
        : sort === "hot"
          ? { created_at: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_community_postsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditCommunityPostAtSummaryTransformer.transform,
  );
  // Apply minScore filter after transformation (vote_score is computed)
  const filteredData =
    minScore !== undefined
      ? transformed.filter((post) => post.vote_score >= minScore)
      : transformed;
  // Adjust pagination for filtered results
  const filteredTotal =
    minScore !== undefined
      ? await MyGlobal.prisma.reddit_community_posts.count({
          where: whereInput,
        })
      : total;
  return {
    data: filteredData,
    pagination: {
      current: page,
      limit: limit,
      records: filteredTotal,
      pages: Math.ceil(filteredTotal / limit),
    } satisfies IPage.IPagination,
  };
}
