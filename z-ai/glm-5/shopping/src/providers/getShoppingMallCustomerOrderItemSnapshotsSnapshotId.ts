import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemSnapshotTransformer } from "../transformers/ShoppingMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrderItemSnapshotsSnapshotId(props: {
  customer: {
    id: string & tags.Format<"uuid">;
  };
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshot> {
  const baseSelect = ShoppingMallOrderItemSnapshotTransformer.select().select;
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: baseSelect.id,
        created_at: baseSelect.created_at,
        price: baseSelect.price,
        product_name: baseSelect.product_name,
        product_description: baseSelect.product_description,
        seller_shop_name: baseSelect.seller_shop_name,
        seller_logo_image: baseSelect.seller_logo_image,
        orderItem: {
          select: {
            id: baseSelect.orderItem.select.id,
            created_at: baseSelect.orderItem.select.created_at,
            price: baseSelect.orderItem.select.price,
            product: baseSelect.orderItem.select.product,
            shopping_mall_shipment_id:
              baseSelect.orderItem.select.shopping_mall_shipment_id,
            quantity: baseSelect.orderItem.select.quantity,
            status: baseSelect.orderItem.select.status,
            variant: baseSelect.orderItem.select.variant,
            seller: baseSelect.orderItem.select.seller,
            order: baseSelect.orderItem.select.order,
          },
        },
        variantOptions: baseSelect.variantOptions,
      },
    });
  if (snapshot.orderItem.order.customer?.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallOrderItemSnapshotTransformer.transform(snapshot);
}
