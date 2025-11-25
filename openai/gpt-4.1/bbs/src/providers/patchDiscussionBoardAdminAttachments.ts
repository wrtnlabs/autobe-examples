import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminAttachments(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment> {
  const {
    page = 1,
    limit = 100,
    search,
    mime_type,
    deleted,
    size_min,
    size_max,
    created_from,
    created_to,
    sort_by = "created_at",
    order = "desc",
  } = props.body ?? {};

  const skip = (page - 1) * limit;

  // Build where condition
  const where: Record<string, any> = {};
  if (typeof deleted === "boolean") {
    where.deleted_at = deleted ? { not: null } : null;
  }
  if (search) {
    // Use partial match on original_filename
    where.original_filename = { contains: search };
  }
  if (mime_type) {
    where.mime_type = mime_type;
  }
  if (size_min !== undefined || size_max !== undefined) {
    where.size_bytes = {};
    if (size_min !== undefined) where.size_bytes.gte = size_min;
    if (size_max !== undefined) where.size_bytes.lte = size_max;
  }
  if (created_from || created_to) {
    where.created_at = {};
    if (created_from) where.created_at.gte = created_from;
    if (created_to) where.created_at.lte = created_to;
  }

  // Sorting
  let orderBy: { [key: string]: "asc" | "desc" };
  if (sort_by === "size_bytes") {
    orderBy = { size_bytes: order };
  } else if (sort_by === "original_filename") {
    orderBy = { original_filename: order };
  } else {
    orderBy = { created_at: order };
  }

  // Query attachments and total count in parallel
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_attachments.count({ where }),
  ]);

  const data = attachments.map((a) => ({
    id: a.id,
    original_filename: a.original_filename,
    storage_filename: a.storage_filename,
    size_bytes: a.size_bytes,
    mime_type: a.mime_type,
    checksum_sha256: a.checksum_sha256,
    storage_location: a.storage_location,
    deleted_at: Object.prototype.hasOwnProperty.call(a, "deleted_at")
      ? a.deleted_at !== null
        ? toISOStringSafe(a.deleted_at)
        : null
      : undefined,
    created_at: toISOStringSafe(a.created_at),
    updated_at: toISOStringSafe(a.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
