import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemConfig.IRequest;
}): Promise<IPageICommunityPlatformSystemConfig.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_system_configsWhereInput = {
    deleted_at: null,
    is_active: props.body.is_active ?? true,
  };
  if (props.body.search) {
    where.key = {
      contains: props.body.search,
    };
  }
  if (props.body.type) {
    where.type = props.body.type;
  }
  const data = await MyGlobal.prisma.community_platform_system_configs.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { key: "asc" },
    },
  );
  const total = await MyGlobal.prisma.community_platform_system_configs.count({
    where,
  });
  return {
    data: data.map((item) => ({
      key: item.key,
      description: item.description,
      type: item.type,
      is_active: item.is_active,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      default_value:
        item.default_value === null ? undefined : item.default_value,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformSystemConfig.ISummary;
}
