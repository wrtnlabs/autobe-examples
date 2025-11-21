import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * This E2E test validates the complete workflow of a customer creating a new
 * support inquiry in the shopping mall platform. The test begins with customer
 * registration to establish authentication context, followed by submission of a
 * comprehensive inquiry with all required fields including title, detailed
 * description, inquiry type classification, priority level assignment, and
 * initial status. The test verifies that the inquiry is created successfully
 * with proper system-generated identifiers, timestamps, and customer
 * attribution. It validates that the inquiry content matches the submitted data
 * and that the workflow status is correctly initialized to 'open' state.
 */
export async function test_api_customer_inquiry_creation(
  connection: api.IConnection,
) {
  // Step 1: Register a customer to establish authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create a comprehensive support inquiry with all required fields
  const inquiryTypes = [
    "product_question",
    "order_issue",
    "account_problem",
    "technical_support",
    "general_feedback",
  ] as const;
  const priorities = ["low", "medium", "high", "critical"] as const;

  const inquiryData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    inquiry_type: RandomGenerator.pick(inquiryTypes),
    priority: RandomGenerator.pick(priorities),
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    {
      body: inquiryData,
    },
  );
  typia.assert(inquiry);

  // Step 3: Validate that the inquiry was created successfully
  TestValidator.equals(
    "inquiry ID should be a valid UUID",
    inquiry.id,
    typia.assert<string & tags.Format<"uuid">>(inquiry.id),
  );
  TestValidator.equals(
    "inquiry title should match submitted data",
    inquiry.title,
    inquiryData.title,
  );
  TestValidator.equals(
    "inquiry body should match submitted data",
    inquiry.body,
    inquiryData.body,
  );
  TestValidator.equals(
    "inquiry type should match submitted data",
    inquiry.inquiry_type,
    inquiryData.inquiry_type,
  );
  TestValidator.equals(
    "inquiry priority should match submitted data",
    inquiry.priority,
    inquiryData.priority,
  );
  TestValidator.equals(
    "inquiry status should be 'open'",
    inquiry.status,
    "open",
  );

  // Step 4: Validate system-generated fields
  TestValidator.predicate("created_at should be a valid ISO date-time", () => {
    const date = new Date(inquiry.created_at);
    return !isNaN(date.getTime());
  });

  TestValidator.predicate("updated_at should be a valid ISO date-time", () => {
    const date = new Date(inquiry.updated_at);
    return !isNaN(date.getTime());
  });

  TestValidator.predicate(
    "created_at and updated_at should be close to each other for new inquiry",
    () => {
      const created = new Date(inquiry.created_at);
      const updated = new Date(inquiry.updated_at);
      const diff = Math.abs(created.getTime() - updated.getTime());
      return diff < 5000; // Within 5 seconds
    },
  );

  // Step 5: Validate that deleted_at is undefined for active inquiry
  TestValidator.equals(
    "deleted_at should be undefined for active inquiry",
    inquiry.deleted_at,
    undefined,
  );
}
