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
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      item: { connect: { id: props.body.order_item_id } },
      approvedBySeller: undefined,
      rejectedBySeller: undefined,
    } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallRefundRequestCollector {
//         export async function collect(props: {
//           body: IEcommerceMallRefundRequest.ICreate;
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
//       approvedBySeller: ...,
//       rejectedBySeller: ...,
//       snapshots: ...,
//       snapshot: ...,
//           } satisfies Prisma.ecommerce_mall_refund_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------