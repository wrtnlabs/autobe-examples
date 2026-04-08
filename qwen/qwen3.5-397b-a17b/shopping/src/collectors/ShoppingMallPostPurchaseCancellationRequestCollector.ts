import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPostPurchaseCancellationRequestCollector {
  export async function collect(props: {
    body: IShoppingMallPostPurchaseCancellationRequest.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    // Query order item to get seller_id for indirect reference
    const orderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
        where: { id: props.body.shopping_mall_order_item_id },
      });
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      seller_response_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.member.id } },
      orderItem: { connect: { id: props.body.shopping_mall_order_item_id } },
      seller: { connect: { id: orderItem.shopping_mall_seller_id } },
      snapshots: undefined,
    } satisfies Prisma.shopping_mall_post_purchase_cancellation_requestsCreateInput;
  }
}
