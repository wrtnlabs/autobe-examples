import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postDiscussionBoardAdminAttachments(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  // Check for existing duplicate (by checksum_sha256)
  const existing = await MyGlobal.prisma.discussion_board_attachments.findFirst(
    {
      where: {
        checksum_sha256: props.body.checksum_sha256,
        deleted_at: null,
      },
    },
  );
  if (existing) {
    throw new HttpException(
      "Duplicate file: An attachment with the same checksum already exists.",
      409,
    );
  }
  // Validation: size_bytes should be positive (enforced by type system and schema)
  if (props.body.size_bytes <= 0) {
    throw new HttpException(
      "Attachment file size must be greater than 0.",
      400,
    );
  }
  // Validation: MIME type presence (enforced by schema, but double check)
  if (!props.body.mime_type) {
    throw new HttpException("MIME type required.", 400);
  }
  // Generate UUID and timestamps as strings only (no type assertions or Date type)
  const id = v4();
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_attachments.create({
    data: {
      id: id,
      original_filename: props.body.original_filename,
      storage_filename: props.body.storage_filename,
      size_bytes: props.body.size_bytes,
      mime_type: props.body.mime_type,
      checksum_sha256: props.body.checksum_sha256,
      storage_location: props.body.storage_location,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    original_filename: created.original_filename,
    storage_filename: created.storage_filename,
    size_bytes: created.size_bytes,
    mime_type: created.mime_type,
    checksum_sha256: created.checksum_sha256,
    storage_location: created.storage_location,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
