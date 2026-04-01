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
    return {
      id,
      rating: props.body.rating,
      title: props.body.title ?? null,
      body: props.body.body,
      is_verified_purchase: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      product: { connect: { id: props.body.product_id } },
      order: { connect: { id: props.body.order_id } },
    } satisfies Prisma.ecommerce_mall_reviewsCreateInput;
  }
}
