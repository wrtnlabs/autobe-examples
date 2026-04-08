import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallReviewCollector {
  export async function collect(props: {
    body: IEcommerceMallReview.ICreate;
    customer: IEntity;
    product: IEntity;
    orderItem: IEntity;
  }) {
    return {
      id: v4(),
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.product.id } },
      orderItem: { connect: { id: props.orderItem.id } },
    } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallReviewCollector {
//         export async function collect(props: {
//           body: IEcommerceMallReview.ICreate;
//           ecommerceMallCustomers: IEntity; // from authorized actor
// ecommerceMallOrders: IEntity; // from path parameter orderId
// ecommerceMallOrderItems: IEntity; // from path parameter itemId
//           
//           
//         }) {
//           return {
//       id: ...,
//       rating: ...,
//       content: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       product: ...,
//       orderItem: ...,
//       reviewSnapshots: ...,
//           } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
//         }
//       }
//--------------------------------------------------------------