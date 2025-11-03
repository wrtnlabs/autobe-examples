import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfig";
import { IPageIShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformConfig";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPlatformConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallPlatformConfig.IRequest;
}): Promise<IPageIShoppingMallPlatformConfig.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = Number(body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.config_name !== undefined &&
      body.config_name !== null && {
        config_name: body.config_name,
      }),
    ...(body.config_value !== undefined &&
      body.config_value !== null && {
        config_value: body.config_value,
      }),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_platform_configs.findMany({
      where,
      select: {
        id: true,
        config_name: true,
        config_value: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_platform_configs.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.max(1, Math.ceil(total / limit)) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: items.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      config_name: item.config_name,
      config_value: item.config_value,
      description: item.description ?? null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
