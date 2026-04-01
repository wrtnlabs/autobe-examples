import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function patchRedditCommunityMemberUsersUserIdPosts(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  // Validate target user exists and is not deleted
  const targetUser = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  if (targetUser === null) {
    throw new HttpException("User not found", 404);
  }
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  let limit = props.body.limit ?? 20;
  // Enforce max limit (100)
  if (limit > 100) {
    limit = 100;
  }
  // Calculate skip for pagination
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereClause: Prisma.reddit_community_postsWhereInput = {
    author_id: props.userId,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      title: {
        contains: props.body.search,
      },
    }),
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
  };
  // Query posts with transformer select for nested data
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereClause,
  });
  // Transform posts using transformer
  const transformedPosts = await ArrayUtil.asyncMap(
    posts,
    RedditCommunityPostAtSummaryTransformer.transform,
  );
  // Calculate total pages
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
