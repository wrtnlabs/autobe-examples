import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";
import { IPageIShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfig";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfig.IRequest;
}): Promise<IPageIShoppingMallSystemConfig.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(props.body.search && {
      OR: [
        {
          config_key: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          config_value: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          category: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.category && { category: props.body.category }),
    ...(props.body.status && { status: props.body.status }),
  };

  const orderByField = props.body.sort_by ?? "created_at";
  const orderByDirection = props.body.order ?? "asc";
  const orderBy = { [orderByField]: orderByDirection };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_system_configs.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_system_configs.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((config) => ({
      id: config.id,
      config_key: config.config_key,
      config_value: config.config_value,
      value_type: config.value_type,
      category: config.category,
      status: config.status,
    })),
  };
}
