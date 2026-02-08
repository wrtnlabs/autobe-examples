import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdmins(props: {
  body: ICommunityPlatformAdmin.IRequest;
}): Promise<IPageICommunityPlatformAdmin.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_admins.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.community_platform_admins.count({
      where: { deleted_at: null },
    }),
  ]);
  return {
    data: records.map((record) => ({
      id: record.id,
      email: record.email,
      display_name: record.display_name,
      bio: record.bio === null ? undefined : record.bio,
      avatar_url: record.avatar_url === null ? undefined : record.avatar_url,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
