import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerInquiry";

export async function test_api_customer_inquiry_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer to obtain authentication and user context
  const customerBody = {
    email: `customer_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "SamplePass123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://test.example.com/signup",
    referrer: "https://google.com/",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a customer inquiry with valid title and body
  const inquiryBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
    status: undefined, // let it default to 'open'
  } satisfies IShoppingMallCustomerInquiry.ICreate;

  const inquiry: IShoppingMallCustomerInquiry =
    await api.functional.shoppingMall.customer.customerInquiries.create(
      connection,
      {
        body: inquiryBody,
      },
    );
  typia.assert(inquiry);

  // Check that inquiry status is 'open' by default
  TestValidator.equals(
    "inquiry status defaults to open",
    inquiry.status,
    "open",
  );

  // Check that inquiry title and body match input
  TestValidator.equals(
    "inquiry title matches input",
    inquiry.title,
    inquiryBody.title,
  );
  TestValidator.equals(
    "inquiry body matches input",
    inquiry.body,
    inquiryBody.body,
  );

  // Check that inquiry customer_id matches authorized customer id
  TestValidator.equals(
    "inquiry customer_id matches authorized customer",
    inquiry.customer_id,
    authorizedCustomer.id,
  );

  // Check that inquiry has valid uuid format id
  TestValidator.predicate(
    "inquiry id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      inquiry.id,
    ),
  );

  // Check that created_at and updated_at are ISO 8601 date-time strings
  TestValidator.predicate(
    "inquiry created_at is ISO 8601",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](?:\.\d+)?Z$/.test(
      inquiry.created_at,
    ),
  );
  TestValidator.predicate(
    "inquiry updated_at is ISO 8601",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](?:\.\d+)?Z$/.test(
      inquiry.updated_at,
    ),
  );
}
