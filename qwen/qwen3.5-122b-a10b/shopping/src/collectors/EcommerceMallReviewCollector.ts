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
  }) {
    const id: string = v4();
    return {
      id,
      rating: props.body.rating,
      content: props.body.content ?? null,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.body.product_id } },
      orderItem: { connect: { id: props.body.order_item_id } },
    } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
  }
}
