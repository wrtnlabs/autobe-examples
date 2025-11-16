import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaq";

export async function test_api_shopping_mall_customer_faq_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a new FAQ entry to update
  const faqCreateBody = {
    question: RandomGenerator.paragraph({ sentences: 3 }),
    answer: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IShoppingMallFaq.ICreate;
  const faq: IShoppingMallFaq =
    await api.functional.shoppingMall.customer.faqs.create(connection, {
      body: faqCreateBody,
    });
  typia.assert(faq);

  // 3. Update the FAQ entry
  const faqUpdateBody = {
    question: RandomGenerator.paragraph({ sentences: 4 }),
    answer: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingMallFaq.IUpdate;
  const updatedFaq: IShoppingMallFaq =
    await api.functional.shoppingMall.customer.faqs.update(connection, {
      id: faq.id,
      body: faqUpdateBody,
    });
  typia.assert(updatedFaq);

  // 4. Verify content is updated correctly
  TestValidator.equals(
    "FAQ ID remains the same after update",
    updatedFaq.id,
    faq.id,
  );
  TestValidator.equals(
    "FAQ question updated correctly",
    updatedFaq.question,
    faqUpdateBody.question,
  );
  TestValidator.equals(
    "FAQ answer updated correctly",
    updatedFaq.answer,
    faqUpdateBody.answer,
  );
}
