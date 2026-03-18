import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorOrdersOrderIdForceCancel(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  if (props.administrator.type !== "administrator")
    throw new HttpException("Forbidden", 403);
  const current = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      status: true,
      orderItems: {
        select: {
          id: true,
          status: true,
          quantity: true,
          shopping_mall_product_variant_id: true,
        },
      },
    },
  });
  if (
    current.status === "cancelled" ||
    current.status === "refunded" ||
    current.status === "delivered"
  )
    throw new HttpException("Conflict", 409);
  const timestamp = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "cancelled",
        updated_at: new Date(timestamp),
      },
    });
    for (const item of current.orderItems) {
      if (item.status !== "cancelled" && item.status !== "refunded") {
        await prisma.shopping_mall_order_items.update({
          where: { id: item.id },
          data: {
            status: "cancelled",
            cancelled_at: new Date(timestamp),
            updated_at: new Date(timestamp),
          },
        });
        await prisma.shopping_mall_inventory_records.create({
          data: {
            id: v4(),
            shopping_mall_product_variant_id:
              item.shopping_mall_product_variant_id,
            quantity_change: item.quantity,
            reason: "administrator_force_cancel",
            occurred_at: new Date(timestamp),
            created_at: new Date(timestamp),
            updated_at: new Date(timestamp),
            deleted_at: null,
          },
        });
      }
    }
  });
  const updated = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(updated);
}
