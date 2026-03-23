import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
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
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { RedditCloneCommentSnapshotTransformer } from "../transformers/RedditCloneCommentSnapshotTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "../transformers/RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditClonePostsPostIdCommentsCommentIdSnapshotsSnapshotId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_clone_comment_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        content: true,
        vote_score: true,
        comment_created_at: true,
        comment_updated_at: true,
        comment_deleted_at: true,
        snapshot_created_at: true,
        reddit_clone_post_id: true,
        reddit_clone_comment_id: true,
        author: RedditCloneMemberAtSummaryTransformer.select(),
        post: RedditClonePostAtSummaryTransformer.select(),
        parentComment: RedditCloneCommentAtSummaryTransformer.select(),
        comment: {
          select: {
            created_at: true,
            updated_at: true,
            id: true,
            deleted_at: true,
            score: true,
            content: true,
            reddit_clone_member_id: true,
            reddit_clone_post_id: true,
            parent_id: true,
          },
        },
      } satisfies Prisma.reddit_clone_comment_snapshotsFindUniqueArgs["select"],
    });
  // Verify referential integrity
  if (snapshot.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  if (snapshot.reddit_clone_comment_id !== props.commentId) {
    throw new HttpException("Not Found", 404);
  }
  return await RedditCloneCommentSnapshotTransformer.transform(snapshot);
}
