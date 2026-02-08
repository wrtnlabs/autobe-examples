import { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPasswordResets(props: {
  user: UserPayload;
  body: ICommunityPlatformUserPasswordReset.IRequest;
}): Promise<IPageICommunityPlatformUserPasswordReset.ISummary> {
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = 0;
  // Get current time as ISO string using toISOStringSafe
  const nowISOString = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  // Construct where argument matching Prisma where type
  const where = { deleted_at: null } as const;
  // Define orderBy with default sorting
  const orderBy = { created_at: "desc" } as const;
  // Fetch records from Prisma
  const records =
    await MyGlobal.prisma.community_platform_user_password_resets.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });
  // Count total records
  const total =
    await MyGlobal.prisma.community_platform_user_password_resets.count({
      where,
    });
  // Map records to ICommunityPlatformUserPasswordReset.ISummary[] with ISO string dates
  const data = records.map((record) => ({
    id: record.id,
    token: record.token,
    user_id: record.community_platform_user_id,
    used: record.used,
    expires_at: record.expires_at ? toISOStringSafe(record.expires_at) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));
  // Return pagination summary
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
