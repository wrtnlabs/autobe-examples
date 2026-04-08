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
    ecommerceMallCustomers: IEntity;
    ecommerceMallOrderItems: IEntity;
  }) {
    // Indirect reference: query order item to get seller_id
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.ecommerceMallOrderItems.id },
      });
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      seller: { connect: { id: orderItem.seller_id } },
    } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallRefundRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallRefundRequest.ICreate;
//           ecommerceMallCustomers: IEntity; // from authorized actor
// ecommerceMallOrderItems: IEntity; // from path parameter orderItemId
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       requested_at: ...,
//       responded_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       customer: ...,
//       seller: ...,
//       snapshots: ...,
//           } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------