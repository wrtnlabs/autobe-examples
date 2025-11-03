import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminLoginAttempt";
import { IPageICommunityPlatformAdminLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminLoginAttempt";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminAdminsAdminIdLoginAttempts(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdminLoginAttempt.IRequest;
}): Promise<IPageICommunityPlatformAdminLoginAttempt.ISummary> {
  const { adminId, body } = props;
  const page = body.page;
  const limit = body.limit;

  // Build attempted_at filter
  const attemptedAtFilter =
    body.from_date !== undefined || body.to_date !== undefined
      ? {
          ...(body.from_date !== undefined && { gte: body.from_date }),
          ...(body.to_date !== undefined && { lte: body.to_date }),
        }
      : undefined;

  // Build main where clause inline
  const where = {
    community_platform_admin_id: adminId,
    ...(attemptedAtFilter && { attempted_at: attemptedAtFilter }),
    ...(body.success !== undefined && { success: body.success }),
    ...(body.ip !== undefined && { ip: body.ip }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_admin_login_attempts.findMany({
      where,
      orderBy: { attempted_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        community_platform_admin_id: true,
        attempted_at: true,
        ip: true,
        success: true,
      },
    }),
    MyGlobal.prisma.community_platform_admin_login_attempts.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      community_platform_admin_id: row.community_platform_admin_id,
      attempted_at: toISOStringSafe(row.attempted_at),
      ip: row.ip,
      success: row.success,
    })),
  };
}
