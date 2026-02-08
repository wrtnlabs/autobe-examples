import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorCommentsCommentIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_comment_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (
    snapshot === null ||
    snapshot.discussion_board_comment_id !== props.commentId
  ) {
    throw new HttpException("Comment snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    comment_id: snapshot.discussion_board_comment_id,
    body: snapshot.body,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    deleted_at:
      snapshot.deleted_at === null
        ? null
        : toISOStringSafe(snapshot.deleted_at),
  };
}
