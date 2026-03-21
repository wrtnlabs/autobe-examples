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

export async function patchRedditCloneGuestUsersUsernamePosts(props: {
  guest: GuestPayload;
  username: string;
  body: IRedditClonePostLink.IRequest;
}): Promise<IPageIRedditClonePostLink.ISummary> {
  // 1. Resolve username to member_id via reddit_clone_members table
  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { username: props.username },
    select: { id: true },
  });
  // 2. If username does not resolve to a valid member, return empty result with 200
  if (member === null) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const memberId = member.id;
  // 3. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Build WHERE conditions
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    reddit_clone_member_id: memberId,
    deleted_at: null,
  };
  // Apply post type filter if specified
  if (props.body.postType !== undefined) {
    whereInput.type = props.body.postType;
  }
  // 5. Determine time range cutoff for 'top' or 'controversial' sorting
  let timeRangeCutoff: Date | undefined;
  if (
    (props.body.sort === "top" || props.body.sort === "controversial") &&
    props.body.timeRange !== undefined &&
    props.body.timeRange !== "all"
  ) {
    const now = new Date();
    switch (props.body.timeRange) {
      case "day":
        timeRangeCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        timeRangeCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeRangeCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeRangeCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
    if (timeRangeCutoff) {
      whereInput.created_at = { gte: timeRangeCutoff };
    }
  }
  // 6. Determine sort order based on sort parameter
  const sortType = props.body.sort ?? "hot";
  let orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput[];
  switch (sortType) {
    case "hot":
      // hot ranking: vote_score / POW(age_hours + 2, 1.5) DESC
      // Using vote_score DESC then created_at DESC as approximation
      orderByInput = [{ vote_score: "desc" }, { created_at: "desc" }];
      break;
    case "new":
      orderByInput = [{ created_at: "desc" }];
      break;
    case "top":
      orderByInput = [{ vote_score: "desc" }];
      break;
    case "controversial":
      // Controversial: balanced upvotes/downvotes
      // Order by vote_score ASC (lowest score first) as proxy
      orderByInput = [{ vote_score: "asc" }, { created_at: "desc" }];
      break;
  }
  // 7. Execute queries - sequential (not parallel) as per rules
  const data = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostLinkAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  // 8. Transform results using transformers
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditClonePostLinkAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
