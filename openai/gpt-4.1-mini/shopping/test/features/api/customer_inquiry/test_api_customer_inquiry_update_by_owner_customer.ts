import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerInquiry";

/**
 * Validates that an authenticated customer can update their own inquiry.
 *
 * The test covers the full business flow:
 *
 * 1. Register a new customer using the join API.
 * 2. Authenticate and obtain authorization token.
 * 3. Create a new customer inquiry.
 * 4. Update the inquiry's title, body, and status with valid data.
 * 5. Verify that the update succeeded and reflects the changes.
 * 6. Validate returned inquiry data with typia.assert to ensure type safety.
 *
 * The test ensures correct authentication, authorization, and business logic
 * enforcement for updating inquiries.
 */
export async function test_api_customer_inquiry_update_by_owner_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "1234";
  const createCustomerBody = {
    email,
    password,
    full_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;

  // Join (register) the customer
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createCustomerBody,
    });
  typia.assert(customer);

  // 2. Create a customer inquiry
  const createInquiryBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    status: "open",
  } satisfies IShoppingMallCustomerInquiry.ICreate;

  const inquiry: IShoppingMallCustomerInquiry =
    await api.functional.shoppingMall.customer.customerInquiries.create(
      connection,
      { body: createInquiryBody },
    );
  typia.assert(inquiry);

  TestValidator.equals(
    "created inquiry title matches",
    inquiry.title,
    createInquiryBody.title,
  );
  TestValidator.equals(
    "created inquiry body matches",
    inquiry.body,
    createInquiryBody.body,
  );
  TestValidator.equals(
    "created inquiry status is open",
    inquiry.status,
    "open",
  );

  // 3. Update the inquiry
  const updateInquiryBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    status: "pending",
    ip: null,
    href: "https://example.com/inquiry/update",
    referrer: "https://search.com",
  } satisfies IShoppingMallCustomerInquiry.IUpdate;

  const updatedInquiry: IShoppingMallCustomerInquiry =
    await api.functional.shoppingMall.customer.customerInquiries.update(
      connection,
      {
        id: inquiry.id,
        body: updateInquiryBody,
      },
    );
  typia.assert(updatedInquiry);

  // Validate update reflected correctly
  TestValidator.equals(
    "updated inquiry id should match original",
    updatedInquiry.id,
    inquiry.id,
  );
  TestValidator.equals(
    "updated inquiry title should be updated",
    updatedInquiry.title,
    updateInquiryBody.title,
  );

  // body is optional nullable, so strict equality for null or string
  TestValidator.equals(
    "updated inquiry body should be updated",
    updatedInquiry.body ?? "",
    updateInquiryBody.body ?? "",
  );
  TestValidator.equals(
    "updated inquiry status should be updated",
    updatedInquiry.status,
    updateInquiryBody.status,
  );

  // Timestamps should be strings and updated_at >= created_at logically
  TestValidator.predicate(
    "updated_at should be greater or equal to created_at",
    updatedInquiry.updated_at >= updatedInquiry.created_at,
  );
}
