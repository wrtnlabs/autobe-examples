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
 * Test updating a seller's answer to a buyer's product question.
 *
 * This test validates the complete workflow where a seller modifies their
 * existing answer to improve response quality, correct errors, or add
 * additional helpful information. The test ensures proper ownership
 * verification, timestamp management, and content replacement.
 *
 * Workflow:
 *
 * 1. Create admin account and product category
 * 2. Create seller account and product sale listing
 * 3. Create buyer account and submit product question
 * 4. Seller creates initial answer to the question
 * 5. Seller updates the answer with revised content
 * 6. Validate answer update preserves ID, updates timestamp, and replaces content
 */
export async function test_api_sale_question_answer_update_by_original_seller(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: "https://admin.shoppingmall.test/join" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    href: "https://seller.shoppingmall.test/join" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale
  const saleCode = RandomGenerator.alphaNumeric(12);

  const saleData = {
    code: saleCode,
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
    }),
    brand: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 }),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 10,
    }),
    meta_keywords: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 5,
    }),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 7,
    }),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 9,
    }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyerData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://buyer.shoppingmall.test/join" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 6: Buyer asks a question about the product
  const questionData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.paragraph({ sentences: 20, wordMin: 5, wordMax: 10 }),
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

  // Step 7: Switch to seller and create initial answer
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.shoppingmall.test/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ILogin,
  });

  const initialAnswerData = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.paragraph({ sentences: 25, wordMin: 5, wordMax: 10 }),
  } satisfies IShoppingMallSaleQuestionAnswer.ICreate;

  const initialAnswer =
    await api.functional.shoppingMall.seller.sales.questions.answer.create(
      connection,
      {
        saleCode: sale.code,
        questionId: question.id,
        body: initialAnswerData,
      },
    );
  typia.assert(initialAnswer);

  // Step 8: Seller updates the answer with revised content
  const updatedAnswerData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 9 }),
    body: RandomGenerator.paragraph({ sentences: 30, wordMin: 6, wordMax: 11 }),
  } satisfies IShoppingMallSaleQuestionAnswer.IUpdate;

  const updatedAnswer =
    await api.functional.shoppingMall.seller.sales.questions.answer.update(
      connection,
      {
        saleCode: sale.code,
        questionId: question.id,
        body: updatedAnswerData,
      },
    );
  typia.assert(updatedAnswer);

  // Step 9: Validate answer update results
  TestValidator.equals(
    "answer ID unchanged",
    updatedAnswer.id,
    initialAnswer.id,
  );
  TestValidator.equals(
    "answer title updated",
    updatedAnswer.title,
    updatedAnswerData.title,
  );
  TestValidator.equals(
    "answer body updated",
    updatedAnswer.body,
    updatedAnswerData.body,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedAnswer.created_at,
    initialAnswer.created_at,
  );
  TestValidator.equals(
    "question association preserved",
    updatedAnswer.shopping_mall_sale_question_id,
    question.id,
  );
  TestValidator.equals(
    "seller ownership preserved",
    updatedAnswer.shopping_mall_seller_id,
    seller.id,
  );

  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    new Date(updatedAnswer.updated_at).getTime() >=
      new Date(initialAnswer.updated_at).getTime(),
  );

  TestValidator.predicate(
    "title meets length constraint",
    updatedAnswer.title.length <= 200,
  );

  TestValidator.predicate(
    "body meets minimum length",
    updatedAnswer.body.length >= 10,
  );

  TestValidator.predicate(
    "body meets maximum length",
    updatedAnswer.body.length <= 2000,
  );
}
