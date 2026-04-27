import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallReviewCollector {
  export async function collect(props: {
    body: IECommerceMallReview.ICreate;
    eCommerceMallCustomers: IEntity;
    eCommerceMallCustomerSessions: IEntity;
  }) {
    const id: string = v4();
    // Query the order item to derive product and order references
    const orderItem =
      await MyGlobal.prisma.e_commerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.order_item_id },
      });
    return {
      id,
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations (use Prisma relation property names)
      customer: { connect: { id: props.eCommerceMallCustomers.id } },
      product: {
        connect: { id: orderItem.e_commerce_mall_product_variant_id },
      },
      orderItem: { connect: { id: orderItem.id } },
      order: { connect: { id: orderItem.e_commerce_mall_order_id } },
    } satisfies Prisma.e_commerce_mall_reviewsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallReviewCollector {
//         export async function collect(props: {
//           body: IECommerceMallReview.ICreate;
//           eCommerceMallCustomers: IEntity; // from authorized actor
// eCommerceMallCustomerSessions: IEntity; // from authorized session
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
//       order: ...,
//       snapshots: ...,
//           } satisfies Prisma.e_commerce_mall_reviewsCreateInput;
//         }
//       }
//--------------------------------------------------------------