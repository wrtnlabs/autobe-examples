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
 * Test retrieval of question answer before seller has posted an answer.
 *
 * This test validates the system's handling of unanswered questions in the Q&A
 * system. When buyers post questions about products, sellers may not answer
 * immediately, creating a state where valid questions exist without answers.
 * The system must handle answer retrieval for such questions gracefully without
 * errors.
 *
 * Workflow:
 *
 * 1. Admin creates account and category for product organization
 * 2. Seller creates account and lists a product sale
 * 3. Buyer creates account and posts a question about the product
 * 4. Attempt to retrieve answer BEFORE seller has posted one
 * 5. Validate that the response is returned successfully (answer may be null or
 *    have null fields)
 *
 * This ensures the API correctly handles unanswered questions, maintaining
 * system reliability and user experience.
 */
export async function test_api_question_answer_retrieval_before_answer_exists(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and creates category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      ip: "127.0.0.1",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller joins and creates product sale
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 3: Buyer joins and posts question
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);

  await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      ip: "127.0.0.1",
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com",
    } satisfies IShoppingMallBuyer.ICreate,
  });

  const question =
    await api.functional.shoppingMall.buyer.sales.questions.postBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallSaleQuestion.ICreate,
      },
    );
  typia.assert(question);

  // Step 4: Attempt to retrieve answer BEFORE seller has posted one
  const answer = await api.functional.shoppingMall.sales.questions.answer.at(
    connection,
    {
      saleCode: sale.code,
      questionId: question.id,
    },
  );

  // Step 5: Validate the response structure
  // The API returns IShoppingMallSaleQuestionAnswer type
  // For unanswered questions, this validates that the system handles it gracefully
  typia.assert(answer);
}
