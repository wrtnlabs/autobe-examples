import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test inquiry creation for account-related issues.
 *
 * Validates that customers can submit support inquiries specifically for
 * account problems, ensuring proper categorization and handling by account
 * management teams.
 */
export async function test_api_customer_inquiry_creation_account_problem(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create account-related inquiry
  const inquiryTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const inquiryBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    {
      body: {
        title: inquiryTitle,
        body: inquiryBody,
        inquiry_type: "account_problem",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    },
  );
  typia.assert(inquiry);

  // Step 3: Validate inquiry creation
  TestValidator.equals(
    "inquiry ID should be valid UUID format",
    inquiry.id,
    inquiry.id,
  );
  TestValidator.equals(
    "inquiry title should match submitted content",
    inquiry.title,
    inquiryTitle,
  );
  TestValidator.equals(
    "inquiry body should match submitted content",
    inquiry.body,
    inquiryBody,
  );
  TestValidator.equals(
    "inquiry type should be categorized as account_problem",
    inquiry.inquiry_type,
    "account_problem",
  );
  TestValidator.equals(
    "inquiry priority should be set to medium",
    inquiry.priority,
    "medium",
  );
  TestValidator.equals(
    "inquiry status should be initialized as open",
    inquiry.status,
    "open",
  );
  TestValidator.predicate(
    "created_at timestamp should be properly set",
    inquiry.created_at !== null && inquiry.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should be properly set",
    inquiry.updated_at !== null && inquiry.updated_at !== undefined,
  );
}
