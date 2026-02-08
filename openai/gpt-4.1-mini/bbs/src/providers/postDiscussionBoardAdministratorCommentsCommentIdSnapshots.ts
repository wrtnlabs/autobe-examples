import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentSnapshotCollector } from "../collectors/DiscussionBoardCommentSnapshotCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorCommentsCommentIdSnapshots(props: {
  administrator: AdministratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentSnapshot.ICreate;
}): Promise<IDiscussionBoardCommentSnapshot> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  const createInput = await DiscussionBoardCommentSnapshotCollector.collect({
    body: props.body,
    comment: comment,
  });
  const created =
    await MyGlobal.prisma.discussion_board_comment_snapshots.create({
      data: createInput,
    });
  return {
    id: created.id,
    discussion_board_comment_id: created.discussion_board_comment_id,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
