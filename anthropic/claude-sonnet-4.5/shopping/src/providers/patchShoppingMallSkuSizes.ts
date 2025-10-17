import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";
import { IPageIShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuSize";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallSkuSizes(props: {
  body: IShoppingMallSkuSize.IRequest;
}): Promise<IPageIShoppingMallSkuSize> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;
  const skip = (page - 1) * limit;

  const [sizes, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_sizes.findMany({
      where: {
        ...(body.category !== undefined &&
          body.category !== null && {
            category: body.category,
          }),
      },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sku_sizes.count({
      where: {
        ...(body.category !== undefined &&
          body.category !== null && {
            category: body.category,
          }),
      },
    }),
  ]);

  const data: IShoppingMallSkuSize[] = sizes.map((size) => ({
    id: size.id,
    value: size.value,
  }));

  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
