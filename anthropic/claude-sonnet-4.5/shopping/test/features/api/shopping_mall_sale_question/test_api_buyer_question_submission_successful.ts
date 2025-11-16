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
 * Test successful product question submission by an authenticated buyer.
 *
 * This test validates the complete workflow of a buyer submitting a question
 * about a product sale, ensuring proper multi-actor setup (admin, seller,
 * buyer), authentication token management, and automatic field population from
 * JWT context.
 *
 * Test workflow:
 *
 * 1. Admin authenticates and creates a product category
 * 2. Seller authenticates and creates a product sale listing
 * 3. Buyer authenticates to establish buyer session with JWT token
 * 4. Buyer submits a question about the product with valid title and body
 * 5. Validate response contains newly created question with:
 *
 *    - Auto-generated UUID id
 *    - Provided title and body content
 *    - Correct shopping_mall_sale_id foreign key reference
 *    - Buyer's shopping_mall_buyer_id extracted from JWT token
 *    - Session shopping_mall_buyer_session_id from authentication context
 *    - System-generated created_at and updated_at timestamps
 *    - Null deleted_at (active question)
 *    - Null/undefined answer (unanswered question)
 * 6. Verify seller and buyer summary references are present
 */
export async function test_api_buyer_question_submission_successful(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates and creates category
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

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
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

  // Step 2: Seller authenticates and creates product sale
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
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

  // Step 3: Buyer authenticates to establish session
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 4: Buyer submits question about the product
  const questionData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IShoppingMallSaleQuestion.ICreate;

  const question =
    await api.functional.shoppingMall.buyer.sales.questions.postBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: questionData,
      },
    );
  typia.assert(question);

  // Step 5: Validate business logic (typia.assert already validated all types)
  TestValidator.equals(
    "question title matches submitted title",
    question.title,
    questionData.title,
  );

  TestValidator.equals(
    "question body matches submitted body",
    question.body,
    questionData.body,
  );

  TestValidator.equals(
    "question references correct sale",
    question.shopping_mall_sale_id,
    sale.id,
  );

  TestValidator.equals(
    "question references authenticated buyer",
    question.shopping_mall_buyer_id,
    buyer.id,
  );

  TestValidator.predicate(
    "question is active (deleted_at is null or undefined)",
    question.deleted_at === null || question.deleted_at === undefined,
  );

  TestValidator.predicate(
    "question is unanswered (answer is null or undefined)",
    question.answer === null || question.answer === undefined,
  );
}
