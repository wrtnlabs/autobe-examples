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
    // Indirect reference: query order_item to get product_id and order_id
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
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      orderItem: { connect: { id: props.body.orderItemId } },
      product: { connect: { id: orderItem.product_id } },
      order: { connect: { id: orderItem.order_id } },
    } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
  }
}
