import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test handling of empty question lists for products with no questions.
 *
 * This test validates that the question retrieval API correctly handles the
 * edge case of products that have no questions yet. It ensures that empty
 * result sets are returned with proper pagination metadata, maintaining
 * consistent response structure even when no data exists.
 *
 * Test flow:
 *
 * 1. Create admin account and authenticate
 * 2. Create a product category
 * 3. Create seller account and authenticate
 * 4. Create a new product sale (without creating any questions)
 * 5. Retrieve questions list and verify empty results with correct pagination
 * 6. Test various filter combinations to ensure all return empty results
 *    appropriately
 */
export async function test_api_sale_questions_empty_results(
  connection: api.IConnection,
) {
  // Create admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Create category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Create seller account
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.content({ paragraphs: 2 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Create product sale without any questions
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Test 1: Basic query - should return empty results with proper pagination
  const emptyResult =
    await api.functional.shoppingMall.sales.questions.patchByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: {
          limit: 20,
          page: 1,
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(emptyResult);

  // Validate empty data array
  TestValidator.equals(
    "data array should be empty",
    emptyResult.data.length,
    0,
  );

  // Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination records should be 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    emptyResult.pagination.limit,
    20,
  );

  // Test 2: Filter by has_answer (true) - should return empty
  const answeredResult =
    await api.functional.shoppingMall.sales.questions.patchByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: {
          limit: 10,
          page: 1,
          has_answer: true,
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(answeredResult);
  TestValidator.equals(
    "answered filter should return empty",
    answeredResult.data.length,
    0,
  );
  TestValidator.equals(
    "answered filter pagination records should be 0",
    answeredResult.pagination.records,
    0,
  );

  // Test 3: Filter by has_answer (false) - should return empty
  const unansweredResult =
    await api.functional.shoppingMall.sales.questions.patchByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: {
          limit: 10,
          page: 1,
          has_answer: false,
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(unansweredResult);
  TestValidator.equals(
    "unanswered filter should return empty",
    unansweredResult.data.length,
    0,
  );
  TestValidator.equals(
    "unanswered filter pagination records should be 0",
    unansweredResult.pagination.records,
    0,
  );

  // Test 4: Search query - should return empty
  const searchResult =
    await api.functional.shoppingMall.sales.questions.patchByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: {
          limit: 10,
          page: 1,
          search: "product quality",
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search filter should return empty",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "search filter pagination records should be 0",
    searchResult.pagination.records,
    0,
  );

  // Test 5: Filter by buyer_id - should return empty
  const buyerFilterResult =
    await api.functional.shoppingMall.sales.questions.patchByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: {
          limit: 10,
          page: 1,
          shopping_mall_buyer_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(buyerFilterResult);
  TestValidator.equals(
    "buyer filter should return empty",
    buyerFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "buyer filter pagination records should be 0",
    buyerFilterResult.pagination.records,
    0,
  );

  // Test 6: Combined filters - should return empty
  const combinedResult =
    await api.functional.shoppingMall.sales.questions.patchByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: {
          limit: 15,
          page: 1,
          has_answer: true,
          search: "warranty",
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filters should return empty",
    combinedResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined filters pagination records should be 0",
    combinedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters pagination pages should be 0",
    combinedResult.pagination.pages,
    0,
  );
}
