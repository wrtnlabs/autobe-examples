import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminUsers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformUser.IRequest;
}): Promise<IPageICommunityPlatformUser.ISummary> {
  const { body } = props;

  // Proper defaults & maximum enforcement
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? Math.min(body.limit, 100) : 20;

  // Build where clause
  const where = {
    ...(body.deleted !== true && { deleted_at: null }),
    ...(body.email && { email: body.email }),
    ...(body.display_name && { display_name: { contains: body.display_name } }),
    ...(body.query
      ? {
          OR: [
            { display_name: { contains: body.query } },
            { email: { contains: body.query } },
          ],
        }
      : {}),
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from && { gte: body.created_from }),
            ...(body.created_to && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Sort
  const allowedSortFields = ["created_at", "updated_at", "display_name"];
  const sort_by =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Data & total: Parallel for perf
  const [users, total] = await Promise.all([
    MyGlobal.prisma.community_platform_users.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, display_name: true },
    }),
    MyGlobal.prisma.community_platform_users.count({ where }),
  ]);

  // Map users to ISummary
  const data = users.map((user) => ({
    id: user.id,
    display_name: user.display_name,
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
