import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { prepare_random_shopping_mall_product_review } from "../prepare/prepare_random_shopping_mall_product_review";
export async function generate_random_shopping_mall_customer_products_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductReview.ICreate>;
    params: {
      productCode: string;
    };
  },
): Promise<IShoppingMallProductReview> {
  const prepared: IShoppingMallProductReview.ICreate =
    prepare_random_shopping_mall_product_review(props.body);
  return await api.functional.shoppingMall.customer.products.reviews.create(
    connection,
    {
      productCode: props.params.productCode,
      body: prepared,
    },
  );
}
