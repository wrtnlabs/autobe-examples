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
    ecommerceMallOrderItems: IEntity;
  }) {
    // Query orderItem to get product_id for indirect reference
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
      // BelongsTo relations
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      product: { connect: { id: orderItem.ecommerce_mall_product_id } },
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
      // HasMany relations - reviewSnapshots is reverse relation, not applicable
    } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
  }
}
