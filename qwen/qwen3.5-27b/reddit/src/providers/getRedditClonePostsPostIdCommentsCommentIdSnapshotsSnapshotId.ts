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

export async function getRedditClonePostsPostIdCommentsCommentIdSnapshotsSnapshotId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommentSnapshot> {
  const record =
    await MyGlobal.prisma.reddit_clone_comment_snapshots.findFirstOrThrow({
      ...RedditCloneCommentSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        reddit_clone_post_id: props.postId,
        reddit_clone_comment_id: props.commentId,
      },
    });
  return await RedditCloneCommentSnapshotTransformer.transform(record);
}
