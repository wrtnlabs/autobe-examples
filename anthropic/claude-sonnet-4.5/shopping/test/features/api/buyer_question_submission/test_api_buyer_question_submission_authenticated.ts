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
 * Test successful question submission by authenticated buyer.
 *
 * This test validates the complete buyer question submission workflow in the
 * shopping marketplace. It ensures that authenticated buyers can successfully
 * ask questions about products to make informed purchase decisions.
 *
 * Workflow:
 *
 * 1. Create and authenticate buyer account
 * 2. Create admin account for category management
 * 3. Create product category
 * 4. Create seller account and product sale
 * 5. Submit question as authenticated buyer
 * 6. Verify question creation with proper data association
 *
 * Validates that:
 *
 * - Question is created successfully
 * - Title and body are correctly persisted
 * - Buyer_id is automatically extracted from JWT token (not from request body)
 * - Question is properly linked to the product sale
 */
export async function test_api_buyer_question_submission_authenticated(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
      email_verified: true,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: undefined,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: typia.random<
        string & tags.Pattern<"^\\+?[1-9]\\d{1,14}$">
      >(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.content({ paragraphs: 2 }),
      store_name: RandomGenerator.name(2),
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Create product sale
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        brand: RandomGenerator.name(1),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        short_description: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 8,
        }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
        weight: typia.random<number>(),
        dimension_length: typia.random<number>(),
        dimension_width: typia.random<number>(),
        dimension_height: typia.random<number>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        warranty_info: RandomGenerator.paragraph({ sentences: 10 }),
        status: undefined,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Switch back to buyer authentication and submit question
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // Step 7: Submit question about the product
  const questionTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const questionBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const question =
    await api.functional.shoppingMall.buyer.sales.questions.postByShoppingmallsalecode(
      connection,
      {
        shoppingMallSaleCode: sale.code,
        body: {
          title: questionTitle,
          body: questionBody,
        } satisfies IShoppingMallSaleQuestion.ICreate,
      },
    );
  typia.assert(question);

  // Step 8: Validate business logic
  TestValidator.equals(
    "question title matches submitted",
    question.title,
    questionTitle,
  );
  TestValidator.equals(
    "question body matches submitted",
    question.body,
    questionBody,
  );
  TestValidator.equals(
    "question is associated with correct buyer",
    question.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "question is linked to correct sale",
    question.shopping_mall_sale_id,
    sale.id,
  );
}
