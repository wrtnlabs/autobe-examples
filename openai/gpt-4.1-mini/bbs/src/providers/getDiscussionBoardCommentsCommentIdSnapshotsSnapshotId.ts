import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentSnapshotTransformer } from "../transformers/DiscussionBoardCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardCommentsCommentIdSnapshotsSnapshotId(props: {
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_comment_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        discussion_board_comment_id: props.commentId,
      },
      ...DiscussionBoardCommentSnapshotTransformer.select(),
    });
  // Security checks would be here if user context was provided
  return await DiscussionBoardCommentSnapshotTransformer.transform(snapshot);
}
