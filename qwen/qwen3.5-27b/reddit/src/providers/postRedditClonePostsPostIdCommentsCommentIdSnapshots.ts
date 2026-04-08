import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentSnapshotTransformer } from "../transformers/RedditCloneCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditClonePostsPostIdCommentsCommentIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommentSnapshot> {
  // Step 1: Validate comment exists, is not deleted, and belongs to the specified post
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: {
        id: props.commentId,
        deleted_at: null,
        reddit_clone_post_id: props.postId,
      },
      select: {
        id: true,
        reddit_clone_user_profile_id: true,
        reddit_clone_post_id: true,
        parent_comment_id: true,
        content: true,
        created_at: true,
        updated_at: true,
      },
    },
  );
  // Step 2: Create the snapshot with all comment fields denormalized
  const snapshot = await MyGlobal.prisma.reddit_clone_comment_snapshots.create({
    data: {
      id: v4(),
      reddit_clone_comment_id: comment.id,
      user_profile_id: comment.reddit_clone_user_profile_id,
      reddit_clone_post_id: comment.reddit_clone_post_id,
      parent_comment_id: comment.parent_comment_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      snapshot_created_at: new Date(),
    },
    ...RedditCloneCommentSnapshotTransformer.select(),
  });
  // Step 3: Transform and return the snapshot
  return await RedditCloneCommentSnapshotTransformer.transform(snapshot);
}
