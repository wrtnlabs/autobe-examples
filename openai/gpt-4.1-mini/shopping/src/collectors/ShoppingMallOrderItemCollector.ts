import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderItemCollector {
  export async function collect(props: {
    body: IShoppingMallOrderItem.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      quantity: props.body.quantity,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.body.shoppingMallOrderId } },
      productVariant: {
        connect: { id: props.body.shoppingMallProductVariantId },
      },
      // Optional hasMany relations are not created here
      snapshots: undefined,
      shipmentItems: undefined,
      cancellationRequests: undefined,
      refundRequests: undefined,
      reviews: undefined,
      shipmentOrderItems: undefined,
      productReviews: undefined,
      productReviewSnapshots: undefined,
    } satisfies Prisma.shopping_mall_order_itemsCreateInput;
  }
}
