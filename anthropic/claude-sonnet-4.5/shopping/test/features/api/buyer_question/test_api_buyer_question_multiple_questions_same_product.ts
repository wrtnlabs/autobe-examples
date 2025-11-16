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
 * Test that a single buyer can submit multiple questions to the same product.
 *
 * This test validates the Q&A system's support for comprehensive product
 * research by allowing buyers to ask multiple questions about different aspects
 * of the same product without restrictions.
 *
 * Workflow:
 *
 * 1. Set up prerequisites: admin, category, seller, and product
 * 2. Create and authenticate as a buyer
 * 3. Submit 3-5 questions about the same product with varying content
 * 4. Verify all questions are created with unique IDs
 * 5. Confirm all questions belong to the same buyer and product
 */
export async function test_api_buyer_question_multiple_questions_same_product(
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

  // Step 2: Create a product category
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

  // Step 4: Create a product sale
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    brand: RandomGenerator.name(1),
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

  // Step 6: Submit multiple questions (3-5) about the same product
  const questionCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<5>
  >() satisfies number as number;
  const questions: IShoppingMallSaleQuestion[] = await ArrayUtil.asyncRepeat(
    questionCount,
    async (index) => {
      const questionData = {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IShoppingMallSaleQuestion.ICreate;

      const question =
        await api.functional.shoppingMall.buyer.sales.questions.postByShoppingmallsalecode(
          connection,
          {
            shoppingMallSaleCode: sale.code,
            body: questionData,
          },
        );
      typia.assert(question);
      return question;
    },
  );

  // Step 7: Verify all questions are created successfully with unique IDs
  TestValidator.predicate(
    "all questions created successfully",
    questions.length === questionCount,
  );

  const questionIds = questions.map((q) => q.id);
  const uniqueIds = new Set(questionIds);
  TestValidator.predicate(
    "all questions have unique IDs",
    uniqueIds.size === questionCount,
  );

  // Step 8: Verify all questions belong to the same buyer
  const buyerIds = questions.map((q) => q.shopping_mall_buyer_id);
  const uniqueBuyerIds = new Set(buyerIds);
  TestValidator.predicate(
    "all questions associated with same buyer",
    uniqueBuyerIds.size === 1 && buyerIds[0] === buyer.id,
  );

  // Step 9: Verify all questions belong to the same product sale
  const saleIds = questions.map((q) => q.shopping_mall_sale_id);
  const uniqueSaleIds = new Set(saleIds);
  TestValidator.predicate(
    "all questions associated with same product",
    uniqueSaleIds.size === 1 && saleIds[0] === sale.id,
  );

  // Step 10: Verify each question has proper content
  questions.forEach((question, index) => {
    TestValidator.predicate(
      `question ${index + 1} has valid title`,
      question.title.length > 0,
    );
    TestValidator.predicate(
      `question ${index + 1} has valid body`,
      question.body.length >= 10 && question.body.length <= 2000,
    );
  });
}
