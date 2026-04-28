import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformCancellationRequestCollector {
  export async function collect(props: {
    body: IEcommercePlatformCancellationRequest.ICreate;
    ecommercePlatformCustomers: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      seller_response_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      orderItem: { connect: { id: props.body.orderItemId } },
      customer: { connect: { id: props.ecommercePlatformCustomers.id } },
    } satisfies Prisma.ecommerce_platform_cancellation_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformCancellationRequestCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformCancellationRequest.ICreate;
//           ecommercePlatformCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       seller_response_reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       orderItem: ...,
//       customer: ...,
//       snapshots: ...,
//           } satisfies Prisma.ecommerce_platform_cancellation_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------