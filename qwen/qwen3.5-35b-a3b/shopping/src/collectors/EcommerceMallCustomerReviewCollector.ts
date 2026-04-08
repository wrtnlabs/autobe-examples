import { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCustomerReviewCollector {
  export async function collect(props: {
    body: IEcommerceMallCustomerReview.ICreate;
    ecommerceMallOrders: IEntity;
    ecommerceMallOrderItems: IEntity;
    ecommerceMallMembers: IEntity;
  }) {
    // Query orderItem to get product_id via productVariant
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.ecommerceMallOrderItems.id },
        include: { productVariant: { select: { product_id: true } } },
      });
    return {
      id: v4(),
      rating: props.body.rating,
      text: props.body.text ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallMembers.id } },
      product: { connect: { id: orderItem.productVariant.product_id } },
      order: { connect: { id: props.ecommerceMallOrders.id } },
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
    } satisfies Prisma.ecommerce_mall_customer_reviewsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCustomerReviewCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCustomerReview.ICreate;
//           ecommerceMallOrders: IEntity; // from path parameter orderId
// ecommerceMallOrderItems: IEntity; // from path parameter itemId
// ecommerceMallMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       rating: ...,
//       text: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       product: ...,
//       order: ...,
//       orderItem: ...,
//       reviewSnapshots: ...,
//       reviewAuditSnapshots: ...,
//           } satisfies Prisma.ecommerce_mall_customer_reviewsCreateInput;
//         }
//       }
//--------------------------------------------------------------