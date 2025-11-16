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
import type { IShoppingMallReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSellerResponse";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test filtering product questions by answer status (answered vs unanswered).
 *
 * This test validates the has_answer filter functionality for product sale
 * questions. Since no API exists to create question answers, this test focuses
 * on validating the filter behavior with unanswered questions and verifying
 * that the pagination and filtering logic works correctly.
 *
 * Test workflow:
 *
 * 1. Admin creates a category for product organization
 * 2. Seller authenticates and creates a product sale listing
 * 3. Buyer authenticates and submits multiple questions (at least 4)
 * 4. Test has_answer=null filter to retrieve all questions
 * 5. Test has_answer=false filter to retrieve unanswered questions
 * 6. Verify pagination metadata and has_answer flags are correct
 */
export async function test_api_sale_questions_search_filtering_by_answer_status(
  connection: api.IConnection,
) {
  // Step 1: Admin creates category
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller authenticates and creates product
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/home",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

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

  // Step 3: Buyer authenticates and submits multiple questions
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      href: "https://buyer.example.com/join",
      referrer: "https://buyer.example.com/home",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  const questions = await ArrayUtil.asyncRepeat(4, async (index) => {
    const question =
      await api.functional.shoppingMall.buyer.sales.questions.postBySalecode(
        connection,
        {
          saleCode: sale.code,
          body: {
            title: `Question ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            body: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 5,
              sentenceMax: 10,
            }),
          } satisfies IShoppingMallSaleQuestion.ICreate,
        },
      );
    typia.assert(question);
    return question;
  });

  // Step 4: Test has_answer=null filter (all questions)
  const allQuestionsPage =
    await api.functional.shoppingMall.sales.questions.patchBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: {
          limit: 10,
          page: 1,
          has_answer: null,
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(allQuestionsPage);

  TestValidator.equals(
    "total questions count should be 4",
    allQuestionsPage.pagination.records,
    4,
  );

  // Step 5: Test has_answer=false filter (unanswered questions)
  const unansweredPage =
    await api.functional.shoppingMall.sales.questions.patchBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: {
          limit: 10,
          page: 1,
          has_answer: false,
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(unansweredPage);

  TestValidator.equals(
    "unanswered questions count should be 4",
    unansweredPage.pagination.records,
    4,
  );

  for (const question of unansweredPage.data) {
    TestValidator.predicate(
      "unanswered question should have has_answer false",
      question.has_answer === false,
    );
  }

  // Step 6: Test has_answer=true filter (answered questions - should be empty)
  const answeredPage =
    await api.functional.shoppingMall.sales.questions.patchBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: {
          limit: 10,
          page: 1,
          has_answer: true,
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  typia.assert(answeredPage);

  TestValidator.equals(
    "answered questions count should be 0 (no answers exist)",
    answeredPage.pagination.records,
    0,
  );

  TestValidator.equals(
    "answered questions data should be empty array",
    answeredPage.data.length,
    0,
  );
}
