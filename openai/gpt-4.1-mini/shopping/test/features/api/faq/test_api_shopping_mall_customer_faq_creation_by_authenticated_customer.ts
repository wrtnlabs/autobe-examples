import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaq";

export async function test_api_shopping_mall_customer_faq_creation_by_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Customer join (registration and authentication)
  const createCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    ip: null, // optional and nullable
    href: "https://shoppingmall.example.com/signup",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createCustomerBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create an FAQ entry as the authorized customer
  const faqCreateBody = {
    question: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    answer: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingMallFaq.ICreate;

  const faq: IShoppingMallFaq =
    await api.functional.shoppingMall.customer.faqs.create(connection, {
      body: faqCreateBody,
    });
  typia.assert(faq);

  // 3. Validate that response question and answer matches input
  TestValidator.equals(
    "FAQ question matches input",
    faq.question,
    faqCreateBody.question,
  );
  TestValidator.equals(
    "FAQ answer matches input",
    faq.answer,
    faqCreateBody.answer,
  );

  // 4. Validate response id is a UUID
  TestValidator.predicate(
    "FAQ id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      faq.id,
    ),
  );

  // 5. Validate created_at and updated_at presence and format
  TestValidator.predicate(
    "FAQ created_at is ISO 8601 date-time",
    typeof faq.created_at === "string" && faq.created_at.length > 0,
  );
  // updated_at can be undefined
  if (faq.updated_at !== undefined) {
    TestValidator.predicate(
      "FAQ updated_at is ISO 8601 date-time",
      typeof faq.updated_at === "string" && faq.updated_at.length > 0,
    );
  }
}
