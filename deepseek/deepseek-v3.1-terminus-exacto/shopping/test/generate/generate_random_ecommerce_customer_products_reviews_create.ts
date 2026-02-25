import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_review } from "../prepare/prepare_random_ecommerce_review";

export async function generate_random_ecommerce_customer_products_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceReview.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceReview> {
  const prepared: IEcommerceReview.ICreate = prepare_random_ecommerce_review(
    props.body,
  );
  const result: IEcommerceReview =
    await api.functional.ecommerce.customer.products.reviews.create(
      connection,
      {
        productId: props.params.productId,
        body: prepared,
      },
    );
  return result;
}
