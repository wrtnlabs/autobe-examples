import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdItemsItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Validate order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Validate order item exists and belongs to the order
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
    });
  // Query snapshots with pagination
  const data =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where: {
        shopping_mall_order_item_id: props.itemId,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        product_name: true,
        product_description: true,
        variant_sku_code: true,
        variant_price: true,
        seller_shop_name: true,
        seller_shop_logo: true,
        created_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where: {
      shopping_mall_order_item_id: props.itemId,
    },
  });
  return {
    data: data.map((snapshot) => {
      const result: IShoppingMallOrderItemSnapshot.ISummary = {
        id: snapshot.id,
        productName: snapshot.product_name,
        variantSkuCode: snapshot.variant_sku_code,
        variantPrice: snapshot.variant_price,
        sellerShopName: snapshot.seller_shop_name,
        sellerShopLogo: snapshot.seller_shop_logo ?? null,
        createdAt: snapshot.created_at.toISOString(),
      };
      return result;
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
