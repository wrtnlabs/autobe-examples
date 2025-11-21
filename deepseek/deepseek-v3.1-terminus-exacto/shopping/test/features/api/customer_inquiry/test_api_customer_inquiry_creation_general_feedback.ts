import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test inquiry creation for general platform feedback.
 *
 * Validates that customers can submit general feedback inquiries with proper
 * categorization. This test ensures that feedback submissions are correctly
 * processed with 'general_feedback' inquiry type and appropriate priority
 * levels for customer experience team handling.
 */
export async function test_api_customer_inquiry_creation_general_feedback(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/feedback",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Submit general feedback inquiry
  const inquiryData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    inquiry_type: "general_feedback" as const,
    priority: "medium" as const,
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    { body: inquiryData },
  );
  typia.assert(inquiry);

  // Step 3: Validate inquiry creation response
  TestValidator.equals(
    "inquiry title should match input",
    inquiry.title,
    inquiryData.title,
  );
  TestValidator.equals(
    "inquiry body should match input",
    inquiry.body,
    inquiryData.body,
  );
  TestValidator.equals(
    "inquiry type should be general_feedback",
    inquiry.inquiry_type,
    "general_feedback",
  );
  TestValidator.equals(
    "inquiry priority should match input",
    inquiry.priority,
    "medium",
  );
  TestValidator.equals("inquiry status should be open", inquiry.status, "open");
  TestValidator.predicate(
    "inquiry should have creation timestamp",
    inquiry.created_at !== undefined,
  );
  TestValidator.predicate(
    "inquiry should have update timestamp",
    inquiry.updated_at !== undefined,
  );

  // Step 4: Validate business logic constraints
  TestValidator.predicate(
    "general feedback should have constructive content",
    inquiryData.body.length > 10,
  );
  TestValidator.predicate(
    "inquiry title should be descriptive",
    inquiryData.title.length > 5,
  );
}
