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
    ecommerceMallCustomers: IEntity;
  }) {
    const id: string = v4();
    // Query order item to get indirect references (product_id and order_id)
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemId },
      });
    return {
      id,
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      product: { connect: { id: orderItem.product_id } },
      order: { connect: { id: orderItem.order_id } },
      orderItem: { connect: { id: props.body.orderItemId } },
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
//       order: ...,
//       orderItem: ...,
//       snapshots: ...,
//           } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
//         }
//       }
//--------------------------------------------------------------