import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceProductReviewCollector {
  export async function collect(props: {
    body: IEcommerceProductReview.ICreate;
    ecommerceProducts: IEntity;
    ecommerceCustomers: IEntity;
  }) {
    const id = v4();
    return {
      id,
      rating: 5,
      comment: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommerceProducts.id } },
      customer: { connect: { id: props.ecommerceCustomers.id } },
    } satisfies Prisma.ecommerce_product_reviewsCreateInput;
  }
}
