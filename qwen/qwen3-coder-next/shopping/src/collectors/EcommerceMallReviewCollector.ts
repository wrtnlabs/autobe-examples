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
    const id: string = v4();
    // Query orderItem to get product_id for product relation
    const orderItemRecord =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.ecommerceMallOrderItems.id },
      });
    return {
      id,
      rating: props.body.rating,
      text_content: props.body.text_content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      product: { connect: { id: orderItemRecord.product_id } },
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
      snapshots: undefined,
      helpfulnessVotes: undefined,
      images: undefined,
    } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
  }
}
