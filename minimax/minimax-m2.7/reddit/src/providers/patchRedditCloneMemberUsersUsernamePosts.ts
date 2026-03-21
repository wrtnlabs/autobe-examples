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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostLinkAtSummaryTransformer } from "../transformers/RedditClonePostLinkAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberUsersUsernamePosts(props: {
  member: MemberPayload;
  username: string;
  body: IRedditClonePostLink.IRequest;
}): Promise<IPageIRedditClonePostLink.ISummary> {
  // Resolve username to member_id via reddit_clone_members table
  const targetMember = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // If username doesn't resolve to valid member, return empty result
  if (targetMember === null) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      },
    };
  }
  // Pagination setup with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause
  const whereClause: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
    reddit_clone_member_id: targetMember.id,
  };
  // Apply post type filter if specified
  if (props.body.postType !== undefined) {
    whereClause.type = props.body.postType;
  }
  // Apply time range filter for 'top' or 'controversial' sorting
  if (
    (props.body.sort === "top" || props.body.sort === "controversial") &&
    props.body.timeRange !== undefined &&
    props.body.timeRange !== "all"
  ) {
    const now = new Date();
    let cutoffMs: number;
    switch (props.body.timeRange) {
      case "day":
        cutoffMs = 24 * 60 * 60 * 1000;
        break;
      case "week":
        cutoffMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        cutoffMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        cutoffMs = 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoffMs = 0;
    }
    const cutoffDate = new Date(now.getTime() - cutoffMs);
    whereClause.created_at = { gte: cutoffDate };
  }
  // Get total count for pagination metadata
  const totalRecords = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereClause,
  });
  // Determine sort order based on sort parameter
  // 'new': Order by created_at DESC
  // 'top': Order by vote_score DESC
  // 'controversial': Order by posts with balanced upvotes/downvotes
  // 'hot' (default): Reddit-style hot ranking algorithm
  // Note: Full hot algorithm requires SQL expression (vote_score/POW(age_hours+2, 1.5))
  // Using vote_score as primary proxy for hot sort in Prisma
  const orderByInput:
    | Prisma.reddit_clone_postsOrderByWithRelationInput
    | Prisma.reddit_clone_postsOrderByWithRelationInput[] = (() => {
    switch (props.body.sort) {
      case "new":
        return { created_at: "desc" };
      case "top":
        return { vote_score: "desc" };
      case "controversial":
        return [{ comment_count: "asc" }, { created_at: "desc" }];
      case "hot":
      default:
        return [{ vote_score: "desc" }, { created_at: "desc" }];
    }
  })();
  // Execute paginated query with transformer
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereClause,
    skip: skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostLinkAtSummaryTransformer.select(),
  });
  // Transform results using transformer for API response format
  const transformedData = await ArrayUtil.asyncMap(
    posts,
    RedditClonePostLinkAtSummaryTransformer.transform,
  );
  // Calculate total pages
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    },
  };
}
