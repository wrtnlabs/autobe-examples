import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallCancellationRequestCollector {
  export async function collect(props: {
    body: IECommerceMallCancellationRequest.ICreate;
    customer: IEntity;
    customerSession: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      rejection_reason: null,
      status: "pending",
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.body.order_item_id } },
      customer: { connect: { id: props.customer.id } },
      customerSession: { connect: { id: props.customerSession.id } },
      seller: undefined,
      sellerSession: undefined,
      snapshots: undefined,
    } satisfies Prisma.e_commerce_mall_cancellation_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallCancellationRequestCollector {
//         export async function collect(props: {
//           body: IECommerceMallCancellationRequest.ICreate;
//           eCommerceMallCustomers: IEntity; // from authorized actor
// eCommerceMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       rejection_reason: ...,
//       status: ...,
//       responded_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       customer: ...,
//       customerSession: ...,
//       seller: ...,
//       sellerSession: ...,
//       snapshots: ...,
//           } satisfies Prisma.e_commerce_mall_cancellation_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------