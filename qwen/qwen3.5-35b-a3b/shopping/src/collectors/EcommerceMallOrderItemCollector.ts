import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallOrderItemCollector {
  export async function collect(props: {
    body: IEcommerceMallOrderItem.ICreate;
    ecommerceMallOrders: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      item_status: "paid",
      quantity: props.body.quantity,
      unit_price: props.body.unit_price,
      product_snapshot: props.body.product_snapshot,
      variant_snapshot: props.body.variant_snapshot,
      seller_profile_snapshot: props.body.seller_profile_snapshot,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      order: { connect: { id: props.ecommerceMallOrders.id } },
      product: { connect: { id: props.body.product_id } },
      productVariant: { connect: { id: props.body.variant_id } },
      // Optional relations (undefined = omit from CreateInput)
      statusSnapshots: undefined,
      shipmentItem: undefined,
      cancellationRequests: undefined,
      refundRequests: undefined,
    } satisfies Prisma.ecommerce_mall_order_itemsCreateInput;
  }
}
