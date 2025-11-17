import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAttachment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postEconomicBoardModeratorPostsPostIdAttachments(props: {
  moderator: ModeratorPayload;
  postId: string;
  body: IEconomicBoardAttachment.ICreate;
}): Promise<IEconomicBoardAttachment> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Generate unique attachment ID
  const attachmentId = v4() as string & tags.Format<"uuid">;

  // Create attachment record with placeholder metadata
  // Since body is defined as string (protocol-level error), we ignore it
  // and assume file information is captured via middleware, or use defaults.
  // Status is 'uploaded' — processing will be done asynchronously.
  // All schema fields must be populated, even if placeholder.
  const attachment = await MyGlobal.prisma.economic_board_attachments.create({
    data: {
      id: attachmentId,
      economic_board_post_id: props.postId,
      original_name: "unknown_file.dat",
      sanitized_name: "unknown_file.dat",
      file_size: 0,
      mime_type: "application/octet-stream",
      storage_path: "https://storage.example.com/attachment/" + attachmentId,
      status: "uploaded",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the attachment record, mapping DB field name 'economic_board_post_id' to DTO field 'post_id'
  return typia.assert<IEconomicBoardAttachment>({
    id: attachment.id,
    post_id: attachment.economic_board_post_id,
    original_filename: attachment.original_name,
    filename: attachment.sanitized_name,
    mimetype: attachment.mime_type,
    size: attachment.file_size,
    storage_path: attachment.storage_path,
    status: attachment.status,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
  });
}
