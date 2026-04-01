import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommentSnapshotTransformer } from "../transformers/RedditLikeCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommentsCommentIdSnapshotsSnapshotId(props: {
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_like_comment_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        comment_id: props.commentId,
      },
      ...RedditLikeCommentSnapshotTransformer.select(),
    });
  return await RedditLikeCommentSnapshotTransformer.transform(snapshot);
}
