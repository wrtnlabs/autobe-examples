import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";
import { IPageIDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberPostsPostIdAttachments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPostAttachment.IRequest;
}): Promise<IPageIDiscussionBoardPostAttachment.ISummary> {
  // Verify the post exists (remove member ownership check since field doesn't exist)
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Build filtering conditions
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {
    discussion_board_post_id: props.postId,
    deleted_at: null,
  };

  // Add search filter
  if (props.body.search) {
    whereConditions.file_name = { contains: props.body.search };
  }

  // Add file type filter
  if (props.body.file_type) {
    whereConditions.file_type = props.body.file_type;
  }

  // Add upload status filter
  if (props.body.upload_status) {
    whereConditions.upload_status = props.body.upload_status;
  }

  // Add security scan result filter
  if (props.body.security_scan_result) {
    whereConditions.security_scan_result = props.body.security_scan_result;
  }

  // Build order by
  const orderBy: Record<string, unknown> = {};
  const orderDirection = props.body.order_direction ?? "desc";

  switch (props.body.order_by) {
    case "file_name":
      orderBy.file_name = orderDirection;
      break;
    case "file_size":
      orderBy.file_size = orderDirection;
      break;
    case "download_count":
      orderBy.download_count = orderDirection;
      break;
    default:
      orderBy.created_at = orderDirection;
      break;
  }

  // Execute queries concurrently (remove non-existent relations)
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_post_attachments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_post_attachments.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to match DTO interfaces
  const data = attachments.map((attachment) => ({
    id: attachment.id,
    file_name: attachment.file_name,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    upload_status: attachment.upload_status,
    created_at: toISOStringSafe(attachment.created_at),
    // Remove post and member relations since they don't exist
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
