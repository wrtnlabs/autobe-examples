import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformRefundRequestCollector {
  export async function collect(props: {
    body: IMallPlatformRefundRequest.ICreate;
    orderItem: IEntity;
    customer: IEntity;
    seller: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      reviewed_at: null,
      review_note: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItem: {
        connect: { id: props.orderItem.id },
      },
      customer: {
        connect: { id: props.customer.id },
      },
      seller: {
        connect: { id: props.seller.id },
      },
      administrator: undefined,
    } satisfies Prisma.mall_platform_refund_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformRefundRequestCollector {
//         export async function collect(props: {
//           body: IMallPlatformRefundRequest.ICreate;
//           mallPlatformOrderItems: IEntity; // from path parameter {orderItemId}
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       reviewed_at: ...,
//       review_note: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       customer: ...,
//       seller: ...,
//       administrator: ...,
//       snapshots: ...,
//           } satisfies Prisma.mall_platform_refund_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------