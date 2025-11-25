import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberCommentsCommentIdAttachments(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.IRequest;
}): Promise<IPageIDiscussionBoardCommentAttachment.ISummary> {
  // Validate comment existence
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify member has access to view this comment
  const canAccess = comment.discussion_board_member_id === props.member.id;
  if (!canAccess) {
    throw new HttpException("Access denied to this comment", 403);
  }

  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build search conditions
  const whereCondition = {
    discussion_board_comment_id: props.commentId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { file_name: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
    ...(props.body.file_type && { file_type: props.body.file_type }),
    ...(props.body.upload_status && {
      upload_status: props.body.upload_status,
    }),
    ...(props.body.security_scan_result && {
      security_scan_result: props.body.security_scan_result,
    }),
    ...((props.body.created_at_start || props.body.created_at_end) && {
      created_at: {
        ...(props.body.created_at_start && {
          gte: props.body.created_at_start,
        }),
        ...(props.body.created_at_end && { lte: props.body.created_at_end }),
      },
    }),
  };

  // Sorting setup - fix orderBy to use proper Prisma SortOrder
  const orderBy = props.body.sort_by
    ? {
        ...(props.body.sort_by === "file_name" && {
          file_name:
            props.body.sort_order === "desc"
              ? Prisma.SortOrder.desc
              : Prisma.SortOrder.asc,
        }),
        ...(props.body.sort_by === "file_size" && {
          file_size:
            props.body.sort_order === "desc"
              ? Prisma.SortOrder.desc
              : Prisma.SortOrder.asc,
        }),
        ...(props.body.sort_by === "created_at" && {
          created_at:
            props.body.sort_order === "desc"
              ? Prisma.SortOrder.desc
              : Prisma.SortOrder.asc,
        }),
        ...(props.body.sort_by === "download_count" && {
          download_count:
            props.body.sort_order === "desc"
              ? Prisma.SortOrder.desc
              : Prisma.SortOrder.asc,
        }),
      }
    : { created_at: Prisma.SortOrder.desc };

  // Execute concurrent queries
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_attachments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_comment_attachments.count({
      where: whereCondition,
    }),
  ]);

  // Transform to API response format
  const data = attachments.map((attachment) => ({
    id: attachment.id,
    file_name: attachment.file_name,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    storage_path: attachment.storage_path,
    upload_status: attachment.upload_status,
    security_scan_result: attachment.security_scan_result ?? "",
    description: attachment.description ?? undefined,
    download_count: attachment.download_count,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
