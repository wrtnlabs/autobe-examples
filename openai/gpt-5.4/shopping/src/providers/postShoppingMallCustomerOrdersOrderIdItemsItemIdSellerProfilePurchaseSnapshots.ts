import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerProfilePurchaseSnapshotCollector } from "../collectors/ShoppingMallSellerProfilePurchaseSnapshotCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerProfilePurchaseSnapshotTransformer } from "../transformers/ShoppingMallSellerProfilePurchaseSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfilePurchaseSnapshot.ICreate;
}): Promise<IShoppingMallSellerProfilePurchaseSnapshot> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const orderItem = await tx.shopping_mall_order_items.findUniqueOrThrow({
        where: { id: props.itemId },
        select: {
          id: true,
          shopping_mall_order_id: true,
        },
      });
      if (orderItem.shopping_mall_order_id !== props.orderId) {
        throw new HttpException(
          "Order item does not belong to the specified order",
          404,
        );
      }
      const existing =
        await tx.shopping_mall_seller_profile_purchase_snapshots.findUnique({
          where: {
            shopping_mall_order_item_id: props.itemId,
          },
          select: {
            id: true,
          },
        });
      if (existing !== null) {
        throw new HttpException(
          "Seller profile purchase snapshot already exists",
          409,
        );
      }
      return await tx.shopping_mall_seller_profile_purchase_snapshots.create({
        data: await ShoppingMallSellerProfilePurchaseSnapshotCollector.collect({
          body: props.body,
          orderItem: {
            id: orderItem.id,
          },
        }),
        ...ShoppingMallSellerProfilePurchaseSnapshotTransformer.select(),
      });
    });
    return await ShoppingMallSellerProfilePurchaseSnapshotTransformer.transform(
      created,
    );
  } catch (error) {
    if (error instanceof HttpException) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Seller profile purchase snapshot already exists",
        409,
      );
    }
    throw error;
  }
}
