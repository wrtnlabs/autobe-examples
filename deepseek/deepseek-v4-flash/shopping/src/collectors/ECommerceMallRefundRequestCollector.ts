import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallRefundRequestCollector {
  export async function collect(props: {
    body: IECommerceMallRefundRequest.ICreate;
    eCommerceMallCustomers: IEntity;
    eCommerceMallCustomerSessions: IEntity;
  }) {
    const id: string = v4();
    // Derive seller from order item's product variant ownership chain
    const orderItem =
      await MyGlobal.prisma.e_commerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemId },
        select: {
          productVariant: {
            select: {
              product: {
                select: { seller_id: true },
              },
            },
          },
        },
      });
    const sellerId: string = orderItem.productVariant.product.seller_id;
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      response_timestamp: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.body.orderItemId } },
      customer: { connect: { id: props.eCommerceMallCustomers.id } },
      seller: { connect: { id: sellerId } },
    } satisfies Prisma.e_commerce_mall_refund_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallRefundRequestCollector {
//         export async function collect(props: {
//           body: IECommerceMallRefundRequest.ICreate;
//           eCommerceMallCustomers: IEntity; // from authorized actor
// eCommerceMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       response_timestamp: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       orderItem: ...,
//       customer: ...,
//       seller: ...,
//       refundRequestSnapshots: ...,
//           } satisfies Prisma.e_commerce_mall_refund_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------