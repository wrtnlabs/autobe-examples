import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for cart items
  const whereClause = {
    customer_id: props.customer.id,
    deleted_at: null,
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  // Fetch cart items
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      quantity: true,
      unit_price: true,
      item_total: true,
      created_at: true,
      updated_at: true,
      product_snapshot_id: true,
      variant_snapshot_id: true,
      seller_id: true,
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: whereClause,
  });
  // Transform each cart item with nested snapshot data
  const transformedItems = await ArrayUtil.asyncMap(cartItems, async (item) => {
    // Fetch productSnapshot using transformer
    const productSnapshotPayload =
      await MyGlobal.prisma.shopping_mall_product_snapshots.findUnique({
        where: { id: item.product_snapshot_id },
        ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
      });
    const productSnapshot = productSnapshotPayload
      ? await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
          productSnapshotPayload,
        )
      : ({} as IShoppingMallProductSnapshot.ISummary);
    // Fetch variantSnapshot using transformer
    const variantSnapshotPayload =
      await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findUnique({
        where: { id: item.variant_snapshot_id },
        ...ShoppingMallProductVariantSnapshotTransformer.select(),
      });
    const variantSnapshotData = variantSnapshotPayload
      ? await ShoppingMallProductVariantSnapshotTransformer.transform(
          variantSnapshotPayload,
        )
      : ({} as IShoppingMallProductVariantSnapshot);
    // Fetch seller using transformer
    const sellerPayload =
      await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: item.seller_id },
        ...ShoppingMallSellerAtSummaryTransformer.select(),
      });
    const seller = sellerPayload
      ? await ShoppingMallSellerAtSummaryTransformer.transform(sellerPayload)
      : ({} as IShoppingMallSeller.ISummary);
    // Return fully constructed cart item summary with safe date conversion
    return {
      id: item.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_total: item.item_total,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(item.updated_at) as string &
        tags.Format<"date-time">,
      productSnapshot: productSnapshot as IShoppingMallProductSnapshot.ISummary,
      variantSnapshot:
        variantSnapshotData as IShoppingMallProductVariantSnapshot,
      seller: seller as IShoppingMallSeller.ISummary,
    } satisfies IShoppingMallCartItem.ISummary;
  });
  return {
    data: transformedItems,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallCartItem.ISummary;
}
