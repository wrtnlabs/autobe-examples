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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentSnapshotTransformer } from "../transformers/RedditCloneCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberPostsPostIdCommentsCommentIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_clone_comment_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        reddit_clone_comment_id: true,
        reddit_clone_post_id: true,
        ...RedditCloneCommentSnapshotTransformer.select().select,
      },
    });
  if (snapshot.reddit_clone_comment_id !== props.commentId) {
    throw new HttpException(
      "Snapshot does not belong to the specified comment",
      404,
    );
  }
  if (snapshot.reddit_clone_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      404,
    );
  }
  return await RedditCloneCommentSnapshotTransformer.transform(snapshot);
}
