import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfiguration";
import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
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

export async function patchShoppingMallAdminConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfiguration.IRequest;
}): Promise<IPageIShoppingMallSystemConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.config_key && {
      config_key: { contains: props.body.config_key },
    }),
    ...(props.body.category && { category: props.body.category }),
    ...(props.body.is_enabled !== undefined && {
      is_enabled: props.body.is_enabled,
    }),
  } satisfies Prisma.shopping_mall_system_configurationsWhereInput;
  const orderByInput =
    props.body.sort_by === "created_at"
      ? {
          created_at:
            props.body.sort_order === "asc"
              ? Prisma.SortOrder.asc
              : Prisma.SortOrder.desc,
        }
      : props.body.sort_by === "updated_at"
        ? {
            updated_at:
              props.body.sort_order === "asc"
                ? Prisma.SortOrder.asc
                : Prisma.SortOrder.desc,
          }
        : props.body.sort_by === "config_key"
          ? {
              config_key:
                props.body.sort_order === "asc"
                  ? Prisma.SortOrder.asc
                  : Prisma.SortOrder.desc,
            }
          : { created_at: Prisma.SortOrder.desc };
  const data =
    await MyGlobal.prisma.shopping_mall_system_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    });
  const total = await MyGlobal.prisma.shopping_mall_system_configurations.count(
    {
      where: whereInput,
    },
  );
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      config_key: record.config_key,
      category: record.category,
      is_enabled: record.is_enabled,
      description: record.description,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
