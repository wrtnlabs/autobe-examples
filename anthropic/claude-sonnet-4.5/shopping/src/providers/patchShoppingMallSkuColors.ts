import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";
import { IPageIShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuColor";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallSkuColors(props: {
  body: IShoppingMallSkuColor.IRequest;
}): Promise<IPageIShoppingMallSkuColor> {
  const { body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const [colors, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_colors.findMany({
      where: {
        ...(body.search && {
          name: {
            contains: body.search,
          },
        }),
      },
      orderBy: {
        name: "asc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sku_colors.count({
      where: {
        ...(body.search && {
          name: {
            contains: body.search,
          },
        }),
      },
    }),
  ]);

  const data: IShoppingMallSkuColor[] = colors.map((color) => ({
    id: color.id as string & tags.Format<"uuid">,
    name: color.name,
    hex_code: color.hex_code ?? undefined,
    created_at: toISOStringSafe(color.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
