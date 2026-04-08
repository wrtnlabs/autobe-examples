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
    ecommerceMallCustomers: IEntity;
    ecommerceMallCustomerSessions: IEntity;
    ecommerceMallSellers: IEntity;
  }) {
    // Query order item to derive seller_id (indirect reference pattern)
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemId },
        include: { product: { select: { ecommerce_mall_seller_id: true } } },
      });
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations using connect
      orderItem: { connect: { id: props.body.orderItemId } },
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      seller: { connect: { id: orderItem.product.ecommerce_mall_seller_id } },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCancellationRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCancellationRequest.ICreate;
//           ecommerceMallCustomers: IEntity; // from authorized actor
// ecommerceMallCustomerSessions: IEntity; // from authorized session
// ecommerceMallSellers: IEntity; // from authorized actor
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