import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerInquiry";

export async function test_api_customer_inquiry_creation_by_new_customer(
  connection: api.IConnection,
) {
  // 1. New customer registration
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const fullName = RandomGenerator.name();
  // Compose IShoppingMallCustomer.ICreate request body
  const joinRequestBody = {
    email: customerEmail,
    password: "password123",
    full_name: fullName,
    href: "https://example.com/signup",
    referrer: "https://example.com",
    ip: null,
  } satisfies IShoppingMallCustomer.ICreate;

  // Call join API to register new customer and obtain authorization token
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(customer);

  // 2. Create customer inquiry
  const inquiryTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const inquiryBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 10,
  });

  const inquiryRequestBody = {
    title: inquiryTitle,
    body: inquiryBody,
    status: undefined, // optional
  } satisfies IShoppingMallCustomerInquiry.ICreate;

  const inquiry: IShoppingMallCustomerInquiry =
    await api.functional.shoppingMall.customer.customerInquiries.create(
      connection,
      {
        body: inquiryRequestBody,
      },
    );
  typia.assert(inquiry);

  // Validate response fields
  TestValidator.predicate("customer inquiry ID exists", inquiry.id.length > 0);
  TestValidator.equals(
    "inquiry title matches",
    inquiry.title,
    inquiryRequestBody.title,
  );
  TestValidator.equals(
    "inquiry body matches",
    inquiry.body,
    inquiryRequestBody.body,
  );
  TestValidator.equals("inquiry status is open", inquiry.status, "open");
  TestValidator.predicate(
    "customer ID matches registered customer",
    inquiry.customer_id === customer.id,
  );
  TestValidator.predicate(
    "created_at is a valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/.test(
      inquiry.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/.test(
      inquiry.updated_at,
    ),
  );
}
