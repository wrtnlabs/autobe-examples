import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProductsProductIdVariants(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_product_variantsWhereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.search && {
      OR: [
        { sku_code: { contains: props.body.search, mode: "insensitive" } },
        { option_values: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.sku_code && {
      sku_code: { contains: props.body.sku_code, mode: "insensitive" },
    }),
    ...(props.body.option_values && {
      option_values: {
        contains: props.body.option_values,
        mode: "insensitive",
      },
    }),
    ...(props.body.deleted_at !== undefined &&
      props.body.deleted_at !== null && {
        deleted_at: props.body.deleted_at ? { not: null } : null,
      }),
  } satisfies Prisma.shopping_mall_product_variantsWhereInput;
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : props.body.sort === "sku_code_asc"
        ? { sku_code: "asc" }
        : props.body.sort === "sku_code_desc"
          ? { sku_code: "desc" }
          : props.body.sort === "price_asc"
            ? { price: "asc" }
            : props.body.sort === "price_desc"
              ? { price: "desc" }
              : { created_at: "desc" }
  ) satisfies Prisma.shopping_mall_product_variantsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_product_variants.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductVariantAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductVariantAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallProductVariant.ISummary;
}
