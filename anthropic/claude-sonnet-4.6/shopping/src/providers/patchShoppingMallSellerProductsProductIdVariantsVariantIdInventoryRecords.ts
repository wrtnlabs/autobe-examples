import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord> {
  // Step 1: Verify product exists
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true, deleted_at: true },
    });
  // Step 2: Verify seller ownership
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Reject soft-deleted product
  if (product.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 3: Verify variant belongs to this product and is not soft-deleted
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (variant === null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 4: Build where clause for inventory records
  const createdAtFilter:
    | Prisma.DateTimeFilter<"shopping_mall_inventory_records">
    | undefined =
    props.body.dateFrom !== undefined || props.body.dateTo !== undefined
      ? {
          ...(props.body.dateFrom !== undefined && {
            gte: new Date(props.body.dateFrom),
          }),
          ...(props.body.dateTo !== undefined && {
            lte: new Date(props.body.dateTo),
          }),
        }
      : undefined;
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(props.body.reasonTypes !== undefined &&
      props.body.reasonTypes.length > 0 && {
        reason_type: { in: props.body.reasonTypes },
      }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  // Step 5: Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 6: Sort direction (default 'asc')
  const orderByInput = {
    created_at: props.body.sort === "desc" ? "desc" : ("asc" as const),
  } satisfies Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput;
  // Step 7: Query data and total count sequentially
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallInventoryRecordTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  // Step 8: Transform records using the existing transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallInventoryRecordTransformer.transform,
  );
  // Step 9: Return paginated response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
