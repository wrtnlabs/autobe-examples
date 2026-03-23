import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_review } from "../prepare/prepare_random_ecommerce_mall_review";

export async function generate_random_ecommerce_mall_customer_products_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallReview.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceMallReview> {
  const prepared: IEcommerceMallReview.ICreate =
    prepare_random_ecommerce_mall_review(props.body);
  return await api.functional.ecommerceMall.customer.products.reviews.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
