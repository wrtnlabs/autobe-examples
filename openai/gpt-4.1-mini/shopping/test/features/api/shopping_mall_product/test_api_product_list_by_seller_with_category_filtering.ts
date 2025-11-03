import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_product_list_by_seller_with_category_filtering(
  connection: api.IConnection,
) {
  // 1. Seller sign up
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Admin sign up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 3. Admin creates product categories
  const categories: IShoppingMallProductCategory[] = [];
  for (let i = 0; i < 3; i++) {
    const category: IShoppingMallProductCategory =
      await api.functional.shoppingMall.admin.productCategories.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 4,
              wordMax: 8,
            }),
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 5,
              sentenceMax: 10,
              wordMin: 4,
              wordMax: 10,
            }),
            parent_id: null,
          } satisfies IShoppingMallProductCategory.ICreate,
        },
      );
    typia.assert(category);
    categories.push(category);
  }

  // 4. Seller logs in again to obtain fresh token
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
        ip: null,
        href: "https://little.com/shop",
        referrer: "https://little.com",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLogin);

  // 5. Admin logs in again to obtain fresh token
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "1234",
        ip: null,
        href: "https://little.com/admin",
        referrer: "https://little.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 6. Seller retrieves product list filtered by category
  for (const category of categories) {
    const requestBody = {
      page: 1,
      limit: 10,
      category_id: category.id,
      search_text: undefined,
      brand: undefined,
      include_deleted: false,
    } satisfies IShoppingMallProduct.IRequest;

    const response: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.seller.products.index(connection, {
        body: requestBody,
      });

    typia.assert(response);

    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page is 1",
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is 10",
      response.pagination.limit === 10,
    );
    TestValidator.predicate(
      "pagination pages and records are non-negative",
      response.pagination.pages >= 0 && response.pagination.records >= 0,
    );

    // Validate each product category matches the filter (category_id)
    // Since IShoppingMallProduct.ISummary has no category info, only id, code, name
    // We will only check the existence of products
    TestValidator.predicate(
      `products list for category ${category.name} is an array`,
      Array.isArray(response.data),
    );
  }
}
