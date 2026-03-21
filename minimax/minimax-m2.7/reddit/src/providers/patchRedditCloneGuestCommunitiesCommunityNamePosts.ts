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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditClonePostLinkAtSummaryTransformer } from "../transformers/RedditClonePostLinkAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestCommunitiesCommunityNamePosts(props: {
  guest: GuestPayload;
  communityName: string;
  body: IRedditClonePostLink.IRequest;
}): Promise<IPageIRedditClonePostLink.ISummary> {
  // 1. Look up the community by name to get the community ID
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  // 2. Build time filter for top/controversial sorting
  const now = new Date();
  let timeFilter: Date | undefined;
  if (props.body.sort === "top" || props.body.sort === "controversial") {
    switch (props.body.timeRange) {
      case "day":
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        // 'all' or undefined - no time filter
        timeFilter = undefined;
    }
  }
  // 3. Build WHERE clause
  const whereInput = {
    reddit_clone_community_id: community.id,
    deleted_at: null,
    ...(timeFilter !== undefined && { created_at: { gte: timeFilter } }),
    ...(props.body.postType !== undefined && { type: props.body.postType }),
  } satisfies Prisma.reddit_clone_postsWhereInput;
  // 4. Build ORDER BY based on sort parameter
  let orderBy: Prisma.reddit_clone_postsOrderByWithRelationInput[];
  const sort = props.body.sort ?? "hot";
  switch (sort) {
    case "new":
      orderBy = [{ created_at: "desc" }];
      break;
    case "top":
      orderBy = [
        { vote_score: "desc" as const },
        { created_at: "desc" as const },
      ];
      break;
    case "controversial":
      // Controversial: posts with balanced up/down votes
      // ORDER BY ABS(vote_score - (total_votes / 2)) ASC
      // Approximation: posts near 0 vote score are controversial
      orderBy = [
        { vote_score: "asc" as const },
        { created_at: "desc" as const },
      ];
      break;
    case "hot":
    default:
      // Hot: vote_score / POW(age_hours + 2, 1.8) DESC
      // Prisma doesn't support complex SQL math functions in ORDER BY
      // Approximation: prioritize recent high-vote posts
      orderBy = [
        { vote_score: "desc" as const },
        { created_at: "desc" as const },
      ];
      break;
  }
  // 5. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 6. Fetch posts with author and community
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    orderBy: orderBy,
    skip: skip,
    take: limit,
    ...RedditClonePostLinkAtSummaryTransformer.select(),
  });
  // 7. Fetch total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  // 8. Transform and return
  const transformedPosts = await ArrayUtil.asyncMap(
    posts,
    RedditClonePostLinkAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedPosts,
  };
}
