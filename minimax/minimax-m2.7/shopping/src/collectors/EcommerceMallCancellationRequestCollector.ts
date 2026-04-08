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
    ecommerceMallOrderItems: IEntity;
    ecommerceMallCustomers: IEntity;
  }) {
    // Query order item to derive seller_id (not directly available in props)
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.ecommerceMallOrderItems.id },
      });
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      seller: { connect: { id: orderItem.ecommerce_mall_order_id } },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCancellationRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCancellationRequest.ICreate;
//           ecommerceMallOrderItems: IEntity; // from path parameter itemId
// ecommerceMallCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       orderItem: ...,
//       customer: ...,
//       seller: ...,
//       snapshots: ...,
//           } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------