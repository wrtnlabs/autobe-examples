import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product } from "../prepare/prepare_random_shopping_mall_product";

/**
 * Generate a random shopping mall product for E2E testing.
 *
 * Prepares random product creation data using the prepare function with
 * randomized name, description, category ID, and base price. Then calls
 * the seller product creation endpoint to persist the product and returns
 * the fully populated product record.
 *
 * The generated product belongs to the authenticated seller and includes
 * all auto-generated fields such as the product identifier, seller profile
 * reference, category summary, timestamps, and empty images/variants/reviews
 * arrays. A newly created product has no variants and will appear in search
 * results but be displayed as unavailable for purchase.
 *
 * The body parameter accepts a DeepPartial of IShoppingMallProduct.ICreate,
 * allowing callers to override any of the four required fields — name,
 * description, shopping_mall_category_id, or base_price — while the prepare
 * function provides randomized defaults for any omitted fields.
 */
export async function generate_random_shopping_mall_seller_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProduct.ICreate>;
  },
): Promise<IShoppingMallProduct> {
  const prepared: IShoppingMallProduct.ICreate =
    prepare_random_shopping_mall_product(props.body);
  const result: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: prepared,
    });
  return result;
}
