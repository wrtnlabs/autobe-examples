import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_review } from "../prepare/prepare_random_shopping_mall_review";

/**
 * Generate a random shopping mall review via the API for E2E testing.
 *
 * Prepares random review data using the prepare function, then calls the creation endpoint.
 * Reviews can only be written for products that have been purchased and delivered.
 * Each customer can write one review per order item, ensuring authentic feedback from verified purchases.
 * The review includes a required star rating from 1 to 5 and optional detailed text content.
 */
export async function generate_random_shopping_mall_customer_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReview.ICreate> | undefined;
  },
): Promise<IShoppingMallReview> {
  const prepared: IShoppingMallReview.ICreate =
    prepare_random_shopping_mall_review(props.body);
  return await api.functional.shoppingMall.customer.reviews.create(connection, {
    body: prepared,
  });
}
