import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardCommentsCommentIdSnapshots(props: {
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardCommentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const dataToUpdate: Partial<
      Omit<Prisma.discussion_board_comment_snapshotsUpdateInput, "id">
    > = {};
    if (props.body.body !== undefined) dataToUpdate.body = props.body.body;
    if (props.body.deletedAt !== undefined)
      dataToUpdate.deleted_at =
        props.body.deletedAt === null ? null : props.body.deletedAt;
    if (Object.keys(dataToUpdate).length > 0) {
      await tx.discussion_board_comment_snapshots.updateMany({
        where: { discussion_board_comment_id: props.commentId },
        data: dataToUpdate,
      });
    }
    const total = await tx.discussion_board_comment_snapshots.count({
      where: { discussion_board_comment_id: props.commentId },
    });
    const snapshots = await tx.discussion_board_comment_snapshots.findMany({
      where: { discussion_board_comment_id: props.commentId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: snapshots.map((snapshot) => ({
        id: snapshot.id,
        body: snapshot.body,
        createdAt: toISOStringSafe(snapshot.created_at),
        updatedAt: toISOStringSafe(snapshot.updated_at),
        deletedAt:
          snapshot.deleted_at !== null && snapshot.deleted_at !== undefined
            ? toISOStringSafe(snapshot.deleted_at)
            : null,
        discussionBoardCommentId: snapshot.discussion_board_comment_id,
      })),
    };
  });
}
