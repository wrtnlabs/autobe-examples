import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallRefundRequestCollector {
  export async function collect(props: {
    body: IShoppingMallRefundRequest.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    const id: string = v4();
    // Query order item with shipment to get delivered_at timestamp
    const orderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
        where: { id: props.body.order_item_id },
        include: {
          shipmentItem: {
            include: {
              shipment: true,
            },
          },
        },
      });
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "PENDING",
      delivered_at:
        orderItem.shipmentItem?.shipment?.delivered_at ?? new Date(),
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      orderItem: { connect: { id: props.body.order_item_id } },
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      respondedBySeller: undefined,
      // HasMany relations
      snapshots: undefined,
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}
