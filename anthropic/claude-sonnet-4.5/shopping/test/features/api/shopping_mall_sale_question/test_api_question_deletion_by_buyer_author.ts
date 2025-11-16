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
 * Test that a buyer can successfully delete their own product question.
 *
 * This test validates buyer ownership and deletion permissions in the Q&A
 * system.
 *
 * Workflow:
 *
 * 1. Admin creates a category for product organization
 * 2. Seller joins and creates a product sale
 * 3. Buyer joins and submits a question about the product
 * 4. Buyer deletes their own question
 *
 * Validation points:
 *
 * - Question deletion succeeds when buyer is the author
 * - Deleted question record is returned
 * - Deletion operation completes successfully
 *
 * This scenario validates the buyer's ability to manage their own questions,
 * allowing them to remove questions that are no longer relevant or were posted
 * in error.
 */
export async function test_api_question_deletion_by_buyer_author(
  connection: api.IConnection,
) {
  // Step 1: Admin creates a category
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
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
    slug: RandomGenerator.alphabets(10),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 2: Seller joins and creates a product sale
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 10 }),
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
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    condition: "new" as const,
    return_policy_days: 30 as const,
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 3: Buyer joins and submits a question about the product
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

  const questionData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.paragraph({ sentences: 10, wordMin: 5, wordMax: 12 }),
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

  // Step 4: Buyer deletes their own question
  const deletedQuestion =
    await api.functional.shoppingMall.sales.questions.erase(connection, {
      saleCode: sale.code,
      questionId: question.id,
    });
  typia.assert(deletedQuestion);

  // Validation: Verify deletion returned the question record
  TestValidator.equals(
    "deleted question id matches",
    deletedQuestion.id,
    question.id,
  );
  TestValidator.equals(
    "deleted question title matches",
    deletedQuestion.title,
    question.title,
  );
  TestValidator.equals(
    "deleted question body matches",
    deletedQuestion.body,
    question.body,
  );
}
