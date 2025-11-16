import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchDiscussionBoardUserCommentsCommentIdAttachments(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.IRequest;
}): Promise<IPageIDiscussionBoardCommentAttachment.ISummary> {
  // Step 1: Confirm the comment exists, is not soft-deleted, and is owned by this user
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found or access denied", 404);
  }
  // Step 2: Build Prisma 'where' for attachments filters
  const where: Record<string, any> = {
    discussion_board_comment_id: props.commentId,
  };
  if (props.body.original_filename) {
    where.original_filename = props.body.original_filename;
  }
  if (props.body.mime_type) {
    where.mime_type = props.body.mime_type;
  }
  if (props.body.created_after || props.body.created_before) {
    where.created_at = {};
    if (props.body.created_after) {
      where.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      where.created_at.lte = props.body.created_before;
    }
  }
  // Step 3: Pagination and sorting
  const limit = props.body.limit ?? 100;
  const offset = props.body.offset ?? 0;
  const allowedSortFields = [
    "created_at",
    "original_filename",
    "file_size_bytes",
  ];
  let orderBy: any = { created_at: "desc" };
  if (
    props.body.sort_by &&
    allowedSortFields.includes(props.body.sort_by) &&
    (props.body.sort_order === "asc" || props.body.sort_order === "desc")
  ) {
    orderBy = { [props.body.sort_by]: props.body.sort_order };
  }
  // Step 4: Query attachments and total count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_attachments.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_comment_attachments.count({ where }),
  ]);
  // Step 5: Convert db records to ISummary array
  const data = records.map((att) => ({
    id: att.id,
    discussion_board_comment_id: att.discussion_board_comment_id,
    file_url: att.file_url,
    original_filename: att.original_filename,
    mime_type: att.mime_type,
    file_size_bytes: att.file_size_bytes,
    created_at: toISOStringSafe(att.created_at),
  }));
  return {
    pagination: {
      current: Math.floor(offset / limit) + 1,
      limit: limit satisfies number as number,
      records: total,
      pages: limit === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
