import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOption";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariantsVariantIdOptions(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOption.IRequest;
}): Promise<IPageIShoppingMallProductVariantOption.ISummary> {
  // Step 1: Validate product exists and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Validate variant belongs to this product and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 3: Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Build where clause with optional partial-match filters
  const whereInput = {
    product_variant_id: props.variantId,
    ...(props.body.key !== undefined && {
      key: { contains: props.body.key, mode: "insensitive" as const },
    }),
    ...(props.body.value !== undefined && {
      value: { contains: props.body.value, mode: "insensitive" as const },
    }),
  } satisfies Prisma.shopping_mall_product_variant_optionsWhereInput;
  // Step 5: Query options with filters, ordering, and pagination
  const data =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findMany({
      where: whereInput,
      select: {
        id: true,
        key: true,
        value: true,
        sequence: true,
        created_at: true,
      },
      orderBy: { sequence: "asc" },
      skip,
      take: limit,
    });
  // Step 6: Count total matching records for pagination metadata
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_options.count({
      where: whereInput,
    });
  // Step 7: Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (option) =>
        ({
          id: option.id,
          key: option.key,
          value: option.value,
          sequence: option.sequence,
          created_at: option.created_at.toISOString(),
        }) satisfies IShoppingMallProductVariantOption.ISummary,
    ),
  };
}
