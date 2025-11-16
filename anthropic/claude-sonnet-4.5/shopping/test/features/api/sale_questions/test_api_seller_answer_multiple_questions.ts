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

export async function test_api_seller_answer_multiple_questions(
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
      admin_level: "super_admin",
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
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create first buyer and submit question
  const buyer1Email = typia.random<string & tags.Format<"email">>();
  const buyer1 = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer1Email,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer1);

  const question1Title = RandomGenerator.paragraph({ sentences: 3 });
  const question1Body = RandomGenerator.paragraph({ sentences: 15 });
  const question1 =
    await api.functional.shoppingMall.buyer.sales.questions.postBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: {
          title: question1Title,
          body: question1Body,
        } satisfies IShoppingMallSaleQuestion.ICreate,
      },
    );
  typia.assert(question1);

  // Step 6: Create second buyer and submit another question
  const buyer2Email = typia.random<string & tags.Format<"email">>();
  const buyer2 = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer2Email,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer2);

  const question2Title = RandomGenerator.paragraph({ sentences: 3 });
  const question2Body = RandomGenerator.paragraph({ sentences: 15 });
  const question2 =
    await api.functional.shoppingMall.buyer.sales.questions.postBySalecode(
      connection,
      {
        saleCode: sale.code,
        body: {
          title: question2Title,
          body: question2Body,
        } satisfies IShoppingMallSaleQuestion.ICreate,
      },
    );
  typia.assert(question2);

  // Step 7: Seller authenticates to answer questions
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 8: Seller answers first question
  const answer1Title = RandomGenerator.paragraph({ sentences: 2 });
  const answer1Body = RandomGenerator.paragraph({ sentences: 20 });
  const answeredQuestion1 =
    await api.functional.shoppingMall.seller.sales.questions.update(
      connection,
      {
        saleCode: sale.code,
        questionId: question1.id,
        body: {
          title: answer1Title,
          body: answer1Body,
        } satisfies IShoppingMallSaleQuestionAnswer.IUpdate,
      },
    );
  typia.assert(answeredQuestion1);

  // Step 9: Seller answers second question
  const answer2Title = RandomGenerator.paragraph({ sentences: 2 });
  const answer2Body = RandomGenerator.paragraph({ sentences: 20 });
  const answeredQuestion2 =
    await api.functional.shoppingMall.seller.sales.questions.update(
      connection,
      {
        saleCode: sale.code,
        questionId: question2.id,
        body: {
          title: answer2Title,
          body: answer2Body,
        } satisfies IShoppingMallSaleQuestionAnswer.IUpdate,
      },
    );
  typia.assert(answeredQuestion2);

  // Step 10: Validate first question has correct answer
  TestValidator.equals(
    "question 1 has answer",
    answeredQuestion1.id,
    question1.id,
  );
  typia.assertGuard(answeredQuestion1.answer!);
  TestValidator.equals(
    "answer 1 title matches",
    answeredQuestion1.answer.title,
    answer1Title,
  );
  TestValidator.equals(
    "answer 1 body matches",
    answeredQuestion1.answer.body,
    answer1Body,
  );

  // Step 11: Validate second question has correct answer
  TestValidator.equals(
    "question 2 has answer",
    answeredQuestion2.id,
    question2.id,
  );
  typia.assertGuard(answeredQuestion2.answer!);
  TestValidator.equals(
    "answer 2 title matches",
    answeredQuestion2.answer.title,
    answer2Title,
  );
  TestValidator.equals(
    "answer 2 body matches",
    answeredQuestion2.answer.body,
    answer2Body,
  );

  // Step 12: Verify one-to-one relationship
  TestValidator.predicate(
    "each question has exactly one answer",
    answeredQuestion1.answer !== null &&
      answeredQuestion1.answer !== undefined &&
      answeredQuestion2.answer !== null &&
      answeredQuestion2.answer !== undefined,
  );
}
