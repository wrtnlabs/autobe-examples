import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallRefundRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallRefundRequest.ICreate;
    orderItem: IEntity;
    customer: IEntity;
  }) {
    // Query order item to get seller_id (indirect reference)
    const orderItemRecord =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.orderItem.id },
      });
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      seller_response_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.orderItem.id } },
      customer: { connect: { id: props.customer.id } },
      seller: { connect: { id: orderItemRecord.ecommerce_mall_order_id } },
    } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallRefundRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallRefundRequest.ICreate;
//           ecommerceMallOrderItems: IEntity; // from path parameter itemId
// ecommerceMallCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       seller_response_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       customer: ...,
//       seller: ...,
//       refundRequestSnapshots: ...,
//           } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------