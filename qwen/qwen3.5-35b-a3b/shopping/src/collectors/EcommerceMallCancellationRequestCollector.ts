import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCancellationRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallCancellationRequest.ICreate;
  }) {
    const id: string = v4();
    // Query order item to get indirect references (order_id and seller_id)
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.order_item_id },
      });
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      item: { connect: { id: props.body.order_item_id } },
      order: { connect: { id: orderItem.ecommerce_mall_order_id } },
      seller: { connect: { id: orderItem.seller_id } },
      // HasMany relations (not needed - handled by triggers)
    } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCancellationRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCancellationRequest.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       item: ...,
//       order: ...,
//       seller: ...,
//       ecommerceMallSnapshotss: ...,
//       ecommerceMallCancellationRequestSnapshotss: ...,
//           } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------