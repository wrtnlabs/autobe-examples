import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { IPageIShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration.IRequest;
}): Promise<IPageIShoppingMallConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = props.body.search
    ? {
        OR: [
          {
            key: { contains: props.body.search, mode: "insensitive" as const },
          },
          {
            value: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_configurations.findMany({
      where,
      skip,
      take: limit,
      orderBy: props.body.sortBy
        ? { [props.body.sortBy]: props.body.sortDirection ?? ("asc" as const) }
        : { key: "asc" as const },
      select: {
        id: true,
        key: true,
        value: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_configurations.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: data.map((d) => ({
      id: d.id,
      key: d.key,
      value: d.value,
      description: "", // The 'description' property is required but not selected from DB, so provide default empty string
    })),
  };
}
