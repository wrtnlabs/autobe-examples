import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductInventoryHistory";
import { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductInventoryHistoryAtSummaryTransformer } from "../transformers/ShoppingMallProductInventoryHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerVariantsVariantIdInventoryHistories(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallProductInventoryHistory.IRequest;
}): Promise<IPageIShoppingMallProductInventoryHistory.ISummary> {
  // Verify variant exists and belongs to seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        deleted_at: true,
        product: {
          select: { seller_id: true },
        },
      },
    });
  if (!variant || variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with combined date range
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(props.body.reason !== undefined && { reason: props.body.reason }),
    ...((props.body.fromDate !== undefined ||
      props.body.toDate !== undefined) && {
      created_at: {
        ...(props.body.fromDate !== undefined && {
          gte: new Date(props.body.fromDate),
        }),
        ...(props.body.toDate !== undefined && {
          lte: new Date(props.body.toDate),
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_product_inventory_historiesWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query with transformer select
  const records =
    await MyGlobal.prisma.shopping_mall_product_inventory_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductInventoryHistoryAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.shopping_mall_product_inventory_histories.count({
      where: whereInput,
    });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    ShoppingMallProductInventoryHistoryAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProductInventoryHistory.ISummary;
}
