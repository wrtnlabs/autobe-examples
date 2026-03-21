import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostLinkAtSummaryTransformer } from "../transformers/RedditClonePostLinkAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePosts(props: {
  body: IRedditClonePostLink.IRequest;
}): Promise<IPageIRedditClonePostLink.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build base where clause - exclude deleted posts
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
  };
  // Apply post type filter if specified
  if (props.body.postType !== undefined) {
    whereInput.type = props.body.postType;
  }
  // Apply time range filter for top/controversial sorting
  if (
    (props.body.sort === "top" || props.body.sort === "controversial") &&
    props.body.timeRange !== undefined &&
    props.body.timeRange !== "all"
  ) {
    const now = new Date();
    const cutoff = new Date();
    switch (props.body.timeRange) {
      case "day":
        cutoff.setDate(now.getDate() - 1);
        break;
      case "week":
        cutoff.setDate(now.getDate() - 7);
        break;
      case "month":
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case "year":
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }
    whereInput.created_at = { gte: cutoff };
  }
  // Build orderBy based on sort type
  let orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "new":
      orderByInput = { created_at: "desc" };
      break;
    case "top":
      orderByInput = { vote_score: "desc" };
      break;
    case "controversial":
      // Controversial: posts with similar up/down votes appear first
      orderByInput = { vote_score: "asc" };
      break;
    case "hot":
    default:
      // Hot algorithm approximation: higher score with recent creation
      orderByInput = { vote_score: "desc", created_at: "desc" };
      break;
  }
  // Execute queries sequentially
  const data = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput satisfies Prisma.reddit_clone_postsWhereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostLinkAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput satisfies Prisma.reddit_clone_postsWhereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditClonePostLinkAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
