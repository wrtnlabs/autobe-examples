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
 * Test retrieving a product question that has not yet been answered by the
 * seller.
 *
 * This test validates that the question retrieval endpoint correctly handles
 * unanswered questions by returning complete question details with a null or
 * undefined answer field. The test creates the necessary prerequisites
 * (category, product sale, buyer question) and then retrieves the question to
 * verify that it shows as unanswered while maintaining all other question
 * information.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as admin
 * 2. Create product category
 * 3. Create and authenticate as seller
 * 4. Create product sale
 * 5. Create and authenticate as buyer
 * 6. Submit product question (no answer created)
 * 7. Retrieve the question and validate unanswered status
 */
export async function test_api_question_retrieval_unanswered(
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
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryData },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 10 }),
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
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    brand: RandomGenerator.name(1),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    { body: saleData },
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

  // Step 6: Submit product question (without seller answer)
  const questionData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IShoppingMallSaleQuestion.ICreate;

  const createdQuestion =
    await api.functional.shoppingMall.buyer.sales.questions.postBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: questionData,
      },
    );
  typia.assert(createdQuestion);

  // Step 7: Retrieve the question and validate it is unanswered
  const retrievedQuestion =
    await api.functional.shoppingMall.sales.questions.at(connection, {
      saleCode: sale.code,
      questionId: createdQuestion.id,
    });
  typia.assert(retrievedQuestion);

  // Validate question details
  TestValidator.equals(
    "question ID matches",
    retrievedQuestion.id,
    createdQuestion.id,
  );
  TestValidator.equals(
    "question title matches",
    retrievedQuestion.title,
    questionData.title,
  );
  TestValidator.equals(
    "question body matches",
    retrievedQuestion.body,
    questionData.body,
  );

  // Validate the answer is null or undefined (unanswered)
  TestValidator.predicate(
    "question has no answer",
    retrievedQuestion.answer === null || retrievedQuestion.answer === undefined,
  );

  // Validate question is associated with correct sale
  TestValidator.equals(
    "question sale ID matches",
    retrievedQuestion.shopping_mall_sale_id,
    sale.id,
  );

  // Validate buyer information
  TestValidator.equals(
    "question buyer ID matches",
    retrievedQuestion.shopping_mall_buyer_id,
    buyer.id,
  );
}
