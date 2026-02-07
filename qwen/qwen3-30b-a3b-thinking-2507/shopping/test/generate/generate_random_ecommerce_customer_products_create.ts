import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_product_review } from "../prepare/prepare_random_ecommerce_product_review";

export async function generate_random_ecommerce_customer_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceProductReview.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceProductReview> {
  const prepared: IEcommerceProductReview.ICreate =
    prepare_random_ecommerce_product_review(props.body);
  return await api.functional.ecommerce.customer.products.create(connection, {
    body: prepared,
    productId: props.params.productId,
  });
}
