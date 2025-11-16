import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test question submission with various content lengths to validate boundary
 * conditions.
 *
 * This test validates that the question submission API properly enforces
 * content length constraints for both title and body fields. It tests minimum,
 * maximum, and typical lengths to ensure the API accepts valid content and
 * properly handles boundary values.
 *
 * The test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category
 * 3. Create seller account and authenticate
 * 4. Create product sale
 * 5. Create buyer account and authenticate
 * 6. Submit questions with minimum length title (1 char) and body (10 chars)
 * 7. Submit questions with maximum length title (200 chars) and body (2000 chars)
 * 8. Submit questions with typical length title (50 chars) and body (200 chars)
 * 9. Verify all questions are created successfully with correct content
 */
export async function test_api_buyer_question_content_length_boundaries(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.content({ paragraphs: 2 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product sale
  const saleData = {
    code: RandomGenerator.alphaNumeric(10),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Create buyer account and authenticate
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 6: Submit question with minimum length title (1 char) and body (10 chars)
  const minLengthQuestion = {
    title: RandomGenerator.alphabets(1),
    body: RandomGenerator.alphabets(10),
  } satisfies IShoppingMallSaleQuestion.ICreate;

  const questionMin =
    await api.functional.shoppingMall.buyer.sales.questions.postByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: minLengthQuestion,
      },
    );
  typia.assert(questionMin);
  TestValidator.equals(
    "minimum title length",
    questionMin.title,
    minLengthQuestion.title,
  );
  TestValidator.equals(
    "minimum body length",
    questionMin.body,
    minLengthQuestion.body,
  );

  // Step 7: Submit question with maximum length title (200 chars) and body (2000 chars)
  const maxLengthQuestion = {
    title: RandomGenerator.alphabets(200),
    body: RandomGenerator.alphabets(2000),
  } satisfies IShoppingMallSaleQuestion.ICreate;

  const questionMax =
    await api.functional.shoppingMall.buyer.sales.questions.postByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: maxLengthQuestion,
      },
    );
  typia.assert(questionMax);
  TestValidator.equals(
    "maximum title length",
    questionMax.title,
    maxLengthQuestion.title,
  );
  TestValidator.equals(
    "maximum body length",
    questionMax.body,
    maxLengthQuestion.body,
  );

  // Step 8: Submit question with typical length title (50 chars) and body (200 chars)
  const typicalLengthQuestion = {
    title: RandomGenerator.alphabets(50),
    body: RandomGenerator.alphabets(200),
  } satisfies IShoppingMallSaleQuestion.ICreate;

  const questionTypical =
    await api.functional.shoppingMall.buyer.sales.questions.postByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: typicalLengthQuestion,
      },
    );
  typia.assert(questionTypical);
  TestValidator.equals(
    "typical title length",
    questionTypical.title,
    typicalLengthQuestion.title,
  );
  TestValidator.equals(
    "typical body length",
    questionTypical.body,
    typicalLengthQuestion.body,
  );

  // Step 9: Verify all questions have correct content lengths
  TestValidator.predicate(
    "minimum title is 1 character",
    questionMin.title.length === 1,
  );
  TestValidator.predicate(
    "minimum body is 10 characters",
    questionMin.body.length === 10,
  );
  TestValidator.predicate(
    "maximum title is 200 characters",
    questionMax.title.length === 200,
  );
  TestValidator.predicate(
    "maximum body is 2000 characters",
    questionMax.body.length === 2000,
  );
  TestValidator.predicate(
    "typical title is 50 characters",
    questionTypical.title.length === 50,
  );
  TestValidator.predicate(
    "typical body is 200 characters",
    questionTypical.body.length === 200,
  );
}
