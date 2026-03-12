import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneUsersUsernamePosts(props: {
  username: string;
}): Promise<IPageIRedditClonePost.ISummary> {
  // Step 1: Find member by username (404 if not found)
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { username: props.username },
    select: { id: true, deleted_at: true },
  });
  // Step 2: Check if member account is deleted
  if (member.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }
  // Step 3: Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Step 4: Query posts with filters and joins
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: {
      reddit_clone_members_id: member.id,
      deleted_at: null,
      community: {
        deleted_at: null,
      },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  // Step 5: Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: {
      reddit_clone_members_id: member.id,
      deleted_at: null,
      community: {
        deleted_at: null,
      },
    },
  });
  // Step 6: Transform posts using transformer
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditClonePostAtSummaryTransformer.transform,
  );
  // Step 7: Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditClonePost.ISummary;
}
