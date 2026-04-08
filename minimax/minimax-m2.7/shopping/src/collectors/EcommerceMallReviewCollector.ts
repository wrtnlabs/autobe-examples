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
    ecommerceMallOrderItems: IEntity;
    ecommerceMallCustomers: IEntity;
  }) {
    // Query order item to get product_id (indirect reference pattern)
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.ecommerceMallOrderItems.id },
      });
    return {
      // Scalar fields
      id: v4(),
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations - use connect with relation property names
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      product: { connect: { id: orderItem.ecommerce_mall_product_id } },
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
      // reviewSnapshots is hasMany - skip for creation
    } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallReviewCollector {
//         export async function collect(props: {
//           body: IEcommerceMallReview.ICreate;
//           ecommerceMallOrderItems: IEntity; // from path parameter itemId
// ecommerceMallCustomers: IEntity; // from authorized actor
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