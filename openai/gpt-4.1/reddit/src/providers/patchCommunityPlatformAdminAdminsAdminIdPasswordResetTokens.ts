import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminPasswordResetToken";
import { IPageICommunityPlatformAdminPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminPasswordResetToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminAdminsAdminIdPasswordResetTokens(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdminPasswordResetToken.IRequest;
}): Promise<IPageICommunityPlatformAdminPasswordResetToken.ISummary> {
  const { admin, adminId, body } = props;

  // Authorization: Only allow self-access
  if (admin.id !== adminId || admin.id !== body.admin_id) {
    throw new HttpException(
      "Forbidden: Cannot view another admin's password reset tokens",
      403,
    );
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.page_size ?? 20;
  const skip = (page - 1) * limit;

  // Filtering: careful merge for created_at/expires_at mutually
  const createdAt =
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          ...(body.created_from !== undefined &&
            body.created_from !== null && { gte: body.created_from }),
          ...(body.created_to !== undefined &&
            body.created_to !== null && { lte: body.created_to }),
        }
      : undefined;

  const expiresAt =
    (body.expires_from !== undefined && body.expires_from !== null) ||
    (body.expires_to !== undefined && body.expires_to !== null)
      ? {
          ...(body.expires_from !== undefined &&
            body.expires_from !== null && { gte: body.expires_from }),
          ...(body.expires_to !== undefined &&
            body.expires_to !== null && { lte: body.expires_to }),
        }
      : undefined;

  const where = {
    community_platform_admin_id: adminId,
    ...(createdAt !== undefined && { created_at: createdAt }),
    ...(expiresAt !== undefined && { expires_at: expiresAt }),
    ...(body.consumed !== undefined &&
      body.consumed !== null && { consumed: body.consumed }),
  };

  // Sorting logic: defaults to created_at desc; only supported fields allowed
  const allowedSortFields = ["created_at", "expires_at", "consumed", "id"];
  const sortField = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";
  const orderBy = { [sortField]: sortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_admin_password_reset_tokens.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_admin_password_reset_tokens.count({
      where,
    }),
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
      community_platform_admin_id: row.community_platform_admin_id,
      token: row.token,
      expires_at: toISOStringSafe(row.expires_at),
      consumed: row.consumed,
      created_at: toISOStringSafe(row.created_at),
      consumed_at: row.consumed_at ? toISOStringSafe(row.consumed_at) : null,
    })),
  };
}
