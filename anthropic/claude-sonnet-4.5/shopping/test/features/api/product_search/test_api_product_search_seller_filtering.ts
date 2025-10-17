import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test multi-seller product catalog and search functionality.
 *
 * This test validates that multiple sellers can create products and that the
 * product search API returns a combined catalog containing products from all
 * sellers. Since the API does not support seller-specific filtering
 * (IShoppingMallProduct.IRequest only has page parameter), this test focuses on
 * multi-seller catalog integration.
 *
 * Test workflow:
 *
 * 1. Create admin account and product category
 * 2. Create first seller and their products
 * 3. Create second seller and their products
 * 4. Search for all products and validate pagination
 * 5. Verify products from multiple sellers can coexist in catalog
 */
export async function test_api_product_search_seller_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create first seller account
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 2 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller1);

  // Step 4: First seller creates products
  const seller1Products = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.shoppingMall.seller.products.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          base_price: typia.random<number>(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  });
  seller1Products.forEach((product) => typia.assert(product));

  // Step 5: Create second seller account
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(),
        business_type: "Corporation",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 2 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller2);

  // Step 6: Second seller creates products
  const seller2Products = await ArrayUtil.asyncRepeat(2, async () => {
    return await api.functional.shoppingMall.seller.products.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          base_price: typia.random<number>(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  });
  seller2Products.forEach((product) => typia.assert(product));

  // Step 7: Search for all products
  const productsPage: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: {
        page: 0,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(productsPage);

  // Step 8: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    productsPage.pagination.current >= 0 &&
      productsPage.pagination.limit >= 0 &&
      productsPage.pagination.records >= 0 &&
      productsPage.pagination.pages >= 0,
  );

  // Step 9: Validate products exist in catalog
  TestValidator.predicate(
    "product catalog should contain products",
    productsPage.data.length > 0,
  );

  // Step 10: Validate total product count includes all created products
  const totalCreatedProducts = seller1Products.length + seller2Products.length;
  TestValidator.predicate(
    "total records should include created products",
    productsPage.pagination.records >= totalCreatedProducts,
  );
}
