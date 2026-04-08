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
  }) {
    return {
      // Scalar fields
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      seller_response_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      orderItem: { connect: { id: props.body.orderItemId } },
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      seller: { connect: { id: props.body.sellerId } },
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
// ecommerceMallCustomerSessions: IEntity; // from authorized session
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