import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceReviewCollector {
  export async function collect(props: {
    body: IEcommerceReview.ICreate;
    ecommerceCustomers: IEntity;
  }) {
    const id: string = v4();
    // Query order item to get product_id (indirect reference)
    const orderItem =
      await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemId },
        select: {
          id: true,
          ecommerce_product_variant_id: true,
        },
      });
    return {
      id,
      rating: props.body.rating,
      content: props.body.content ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceCustomers.id } },
      orderItem: { connect: { id: props.body.orderItemId } },
      product: { connect: { id: orderItem.ecommerce_product_variant_id } },
      snapshots: { create: [] },
    } satisfies Prisma.ecommerce_reviewsCreateInput;
  }
}
