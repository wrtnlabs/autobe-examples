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

export async function test_api_seller_answer_update(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30 as const,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create buyer account and authenticate
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 6: Buyer submits a question about the product
  const question =
    await api.functional.shoppingMall.buyer.sales.questions.postBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IShoppingMallSaleQuestion.ICreate,
      },
    );
  typia.assert(question);

  // Step 7: Switch to seller account and provide initial answer
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const initialAnswerTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialAnswerBody = RandomGenerator.paragraph({ sentences: 10 });
  const answeredQuestion =
    await api.functional.shoppingMall.seller.sales.questions.update(
      connection,
      {
        saleCode: sale.code,
        questionId: question.id,
        body: {
          title: initialAnswerTitle,
          body: initialAnswerBody,
        } satisfies IShoppingMallSaleQuestionAnswer.IUpdate,
      },
    );
  typia.assert(answeredQuestion);
  typia.assertGuard(answeredQuestion.answer!);

  // Step 8: Update the answer with revised content
  const updatedAnswerTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedAnswerBody = RandomGenerator.paragraph({ sentences: 15 });
  const updatedQuestion =
    await api.functional.shoppingMall.seller.sales.questions.update(
      connection,
      {
        saleCode: sale.code,
        questionId: question.id,
        body: {
          title: updatedAnswerTitle,
          body: updatedAnswerBody,
        } satisfies IShoppingMallSaleQuestionAnswer.IUpdate,
      },
    );
  typia.assert(updatedQuestion);

  // Step 9: Validate that the answer was updated correctly
  TestValidator.predicate(
    "answer should exist after update",
    updatedQuestion.answer !== null && updatedQuestion.answer !== undefined,
  );

  if (updatedQuestion.answer !== null && updatedQuestion.answer !== undefined) {
    const updatedAnswer = updatedQuestion.answer;

    TestValidator.equals(
      "updated answer title matches new content",
      updatedAnswer.title,
      updatedAnswerTitle,
    );

    TestValidator.equals(
      "updated answer body matches new content",
      updatedAnswer.body,
      updatedAnswerBody,
    );

    TestValidator.equals(
      "answer maintains association with question",
      updatedAnswer.shopping_mall_sale_question_id,
      question.id,
    );

    TestValidator.equals(
      "answer maintains seller ownership",
      updatedAnswer.shopping_mall_seller_id,
      seller.id,
    );

    TestValidator.predicate(
      "updated_at timestamp is refreshed",
      new Date(updatedAnswer.updated_at).getTime() >=
        new Date(answeredQuestion.answer.updated_at).getTime(),
    );
  }
}
