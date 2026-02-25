import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSearchProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 20) satisfies number as number;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_productsWhereInput = {
    is_deleted: false,
    deleted_at: null,
    base_price: {
      gte: props.body.min_price,
      lte: props.body.max_price,
    },
  } satisfies Prisma.shopping_mall_productsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where,
    skip,
    take: limit,
    orderBy: { base_price: "desc" },
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
