import { IEcommerceOrderItemSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariant";
import { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderItemSnapshotVariantTransformer } from "../transformers/EcommerceOrderItemSnapshotVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerOrdersOrderIdItemsItemIdSnapshotVariant(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItemSnapshotVariant> {
  // Verify order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { ecommerce_customer_id: true },
  });
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify order item exists within the order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { ecommerce_order_id: true },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Not Found", 404);
  }
  // Retrieve variant snapshot through the relationship chain
  const variant =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variants.findFirstOrThrow(
      {
        where: {
          ecommerceOrderItemSnapshot: {
            ecommerceOrderItem: {
              id: props.itemId,
            },
          },
        },
        ...EcommerceOrderItemSnapshotVariantTransformer.select(),
      } satisfies Prisma.ecommerce_order_item_snapshot_variantsFindManyArgs,
    );
  return await EcommerceOrderItemSnapshotVariantTransformer.transform(variant);
}
