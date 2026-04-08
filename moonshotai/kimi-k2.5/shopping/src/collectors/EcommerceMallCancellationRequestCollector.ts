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
    customer: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      response_reason: null,
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.body.orderItemId } },
      customer: { connect: { id: props.customer.id } },
      seller: undefined,
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
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       response_reason: ...,
//       responded_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       customer: ...,
//       seller: ...,
//       snapshots: ...,
//           } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------