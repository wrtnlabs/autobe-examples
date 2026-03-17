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
    // Query order item to verify purchase and get order_id
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: {
          ecommerce_mall_order_id: props.body.order_id,
        },
      });
    // Order item exists = verified purchase (status field not available)
    const isVerifiedPurchase: boolean = true;
    return {
      id,
      rating: props.body.rating,
      title: props.body.title ?? null,
      body: props.body.body,
      is_verified_purchase: isVerifiedPurchase,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      product: { connect: { id: props.body.product_id } },
      order: { connect: { id: orderItem.ecommerce_mall_order_id } },
      helpfulnessVotes: undefined,
      snapshots: undefined,
    } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
  }
}
