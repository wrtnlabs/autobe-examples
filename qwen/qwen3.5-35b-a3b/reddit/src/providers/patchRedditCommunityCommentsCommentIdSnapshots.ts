import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentSnapshot";
import { IRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommentsCommentIdSnapshots(props: {
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentSnapshot.IRequest;
}): Promise<IPageIRedditCommunityCommentSnapshot.ISummary> {
  // Verify comment exists and is accessible
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        deleted_at: true,
        reddit_community_posts_id: true,
      },
    });
  // Check soft-deletion: deleted comments are not accessible
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Get post to verify community context
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: comment.reddit_community_posts_id },
    select: { id: true, community_id: true },
  });
  // Apply pagination and sorting
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "version";
  const order = props.body.order ?? "asc";
  const skip = (page - 1) * limit;
  const orderByInput =
    sort === "version"
      ? { version: order as "asc" | "desc" }
      : { created_at: order as "asc" | "desc" };
  // Query snapshots and total count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_snapshots.findMany({
      where: { comment_id: props.commentId },
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCommunityCommentSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_comment_snapshots.count({
      where: { comment_id: props.commentId },
    }),
  ]);
  // Transform snapshots using transformer
  const snapshots = await ArrayUtil.asyncMap(
    data,
    RedditCommunityCommentSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: snapshots,
  };
}
