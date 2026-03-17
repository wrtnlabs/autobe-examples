import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductPurchaseSnapshotOptionValueCollector } from "../collectors/ShoppingMallProductPurchaseSnapshotOptionValueCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductPurchaseSnapshotOptionValueTransformer } from "../transformers/ShoppingMallProductPurchaseSnapshotOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValues(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  productPurchaseSnapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductPurchaseSnapshotOptionValue.ICreate;
}): Promise<IShoppingMallProductPurchaseSnapshotOptionValue> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
    where: {
      code: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.itemId,
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
      },
    });
  if (orderItem.shopping_mall_order_id !== order.id) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }
  const productPurchaseSnapshot =
    await MyGlobal.prisma.shopping_mall_product_purchase_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.productPurchaseSnapshotId,
        },
        select: {
          id: true,
          shopping_mall_order_item_id: true,
        },
      },
    );
  if (productPurchaseSnapshot.shopping_mall_order_item_id !== orderItem.id) {
    throw new HttpException(
      "Product purchase snapshot does not belong to the specified order item",
      400,
    );
  }
  const existing =
    await MyGlobal.prisma.shopping_mall_product_purchase_snapshot_option_values.findUnique(
      {
        where: {
          shopping_mall_product_purchase_snapshot_id_option_name: {
            shopping_mall_product_purchase_snapshot_id:
              productPurchaseSnapshot.id,
            option_name: props.body.option_name,
          },
        },
        select: {
          id: true,
        },
      },
    );
  if (existing !== null) {
    throw new HttpException(
      "Option name already exists for this product purchase snapshot",
      409,
    );
  }
  const created =
    await MyGlobal.prisma.shopping_mall_product_purchase_snapshot_option_values.create(
      {
        data: await ShoppingMallProductPurchaseSnapshotOptionValueCollector.collect(
          {
            body: props.body,
            shoppingMallOrders: { id: order.id },
            shoppingMallOrderItems: { id: orderItem.id },
            shoppingMallProductPurchaseSnapshots: {
              id: productPurchaseSnapshot.id,
            },
          },
        ),
        ...ShoppingMallProductPurchaseSnapshotOptionValueTransformer.select(),
      },
    );
  return await ShoppingMallProductPurchaseSnapshotOptionValueTransformer.transform(
    created,
  );
}
