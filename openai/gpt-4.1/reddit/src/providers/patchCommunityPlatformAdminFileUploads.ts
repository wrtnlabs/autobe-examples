import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import { IPageICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileUpload";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminFileUploads(props: {
  admin: AdminPayload;
  body: ICommunityPlatformFileUpload.IRequest;
}): Promise<IPageICommunityPlatformFileUpload.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const offset = (Number(page) - 1) * Number(limit);

  // Construct Prisma WHERE conditions
  const where: any = {
    ...(body.uploaded_by_member_id !== undefined &&
      body.uploaded_by_member_id !== null && {
        uploaded_by_member_id: body.uploaded_by_member_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.mime_type !== undefined &&
      body.mime_type !== null && { mime_type: body.mime_type }),
    ...(body.original_filename !== undefined &&
      body.original_filename !== null && {
        original_filename: { contains: body.original_filename },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_file_uploads.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_file_uploads.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      uploaded_by_member_id: row.uploaded_by_member_id,
      original_filename: row.original_filename,
      mime_type: row.mime_type,
      file_size_bytes: row.file_size_bytes,
      url: row.url,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
