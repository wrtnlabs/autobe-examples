import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordAtSummaryTransformer } from "../transformers/ShoppingMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  // Step 1: Verify variant ownership through product-seller relationship
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Step 3: Build WHERE clause with all filters
  const whereInput = {
    variant_id: props.variantId,
    ...(props.body.reason !== undefined &&
      props.body.reason !== null && {
        reason: { contains: props.body.reason, mode: "insensitive" as const },
      }),
    ...(props.body.quantityChangeType === "positive" && {
      quantity_change: { gt: 0 },
    }),
    ...(props.body.quantityChangeType === "negative" && {
      quantity_change: { lt: 0 },
    }),
    ...(props.body.createdFrom !== undefined &&
      props.body.createdFrom !== null && {
        created_at: { gte: new Date(props.body.createdFrom) },
      }),
    ...(props.body.createdTo !== undefined &&
      props.body.createdTo !== null && {
        created_at: { lte: new Date(props.body.createdTo) },
      }),
    ...(props.body.sourceType === "manual" && { seller_id: { not: null } }),
    ...(props.body.sourceType === "order" && { order_id: { not: null } }),
    ...(props.body.sourceType === "cancellation" && {
      cancellation_request_id: { not: null },
    }),
    ...(props.body.sourceType === "refund" && {
      refund_request_id: { not: null },
    }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  // Step 4: Query records with transformer select
  const records =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
    });
  // Step 5: Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  // Step 6: Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallInventoryRecordAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
