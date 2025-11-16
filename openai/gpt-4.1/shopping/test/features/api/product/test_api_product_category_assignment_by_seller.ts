import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that an authenticated seller can assign a new category to their own
 * product.
 *
 * This scenario executes the following workflow:
 *
 * 1. Seller registration (create seller account and obtain authentication)
 * 2. Generate a product for this seller (simulate the product summary for
 *    assignment)
 * 3. Generate a category (simulate category summary for assignment)
 * 4. Assign the category to the seller's product using category assignment API
 * 5. Validate the mapping response and linkage (the mapping links the correct
 *    product and category)
 */
export async function test_api_product_category_assignment_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration (obtain authentication)
  const sellerCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://shoppingmall.e2e-test.io/", // fake uri
    referrer: "https://google.com/",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerCreateInput,
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  const sellerSummary = sellerAuthorized.seller!;

  // 2. Generate a mock product summary under this seller (simulate catalog context)
  const productSummary: IShoppingMallProduct.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    default_price: typia.random<number>(),
    business_status: "published",
    seller: sellerSummary,
    categories: [],
    created_at: new Date().toISOString(),
  };

  // 3. Generate a mock category summary (simulate available categories)
  const categorySummary: IShoppingMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 6, wordMax: 10 }),
    parent_id: null,
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 4. Assign the generated category to the product as the authenticated seller
  const assignCategoryBody = {
    shopping_mall_category_id: categorySummary.id,
  } satisfies IShoppingMallProductsCategory.ICreate;

  const mapping =
    await api.functional.shoppingMall.seller.products.categories.create(
      connection,
      {
        productId: productSummary.id,
        body: assignCategoryBody,
      },
    );
  typia.assert(mapping);

  // 5. Validate the returned mapping entity
  TestValidator.equals(
    "category mapping product id matches",
    mapping.product.id,
    productSummary.id,
  );
  TestValidator.equals(
    "category mapping category id matches",
    mapping.category.id,
    categorySummary.id,
  );
}
