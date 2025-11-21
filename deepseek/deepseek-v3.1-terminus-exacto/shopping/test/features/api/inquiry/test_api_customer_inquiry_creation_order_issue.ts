import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test inquiry creation for order-related problems.
 *
 * This E2E test validates the creation of customer support inquiries
 * specifically for order-related issues. A customer registers with the shopping
 * mall platform, then submits an inquiry with inquiry_type set to 'order_issue'
 * and appropriate priority level based on order urgency. The test ensures that
 * order-related inquiries include sufficient order context and that the system
 * properly routes these inquiries to fulfillment support teams.
 */
export async function test_api_customer_inquiry_creation_order_issue(
  connection: api.IConnection,
) {
  // Step 1: Customer registration and authentication setup
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

  // Define valid inquiry types and priorities using const assertions
  const inquiryTypes = [
    "product_question",
    "order_issue",
    "account_problem",
    "technical_support",
    "general_feedback",
  ] as const;
  const priorities = ["low", "medium", "high", "critical"] as const;

  // Step 2: Create order-related inquiry with appropriate priority
  const inquiryData = {
    title: "Order Delivery Issue - Tracking Number Not Updating",
    body: "My order #ORD-2024-12345 was shipped 5 days ago but the tracking information has not been updated. The tracking number is TRK-987654321 and the expected delivery date was yesterday. The order contains 3 items including a smartphone and accessories. I need assistance with tracking my package or getting updated delivery information.",
    inquiry_type: "order_issue" as const,
    priority: "medium" as const,
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    {
      body: inquiryData,
    },
  );
  typia.assert(inquiry);

  // Step 3: Validate inquiry response data and proper routing
  TestValidator.equals(
    "inquiry ID should be valid UUID format",
    inquiry.id,
    inquiry.id,
  );
  TestValidator.equals(
    "inquiry title should match order issue description",
    inquiry.title,
    inquiryData.title,
  );
  TestValidator.equals(
    "inquiry body should contain order context",
    inquiry.body,
    inquiryData.body,
  );
  TestValidator.equals(
    "inquiry type should be order_issue for proper routing",
    inquiry.inquiry_type,
    "order_issue",
  );
  TestValidator.equals(
    "order issue should have medium priority by default",
    inquiry.priority,
    "medium",
  );
  TestValidator.equals(
    "new inquiry should have open status",
    inquiry.status,
    "open",
  );
  TestValidator.predicate(
    "inquiry should have valid creation timestamp",
    new Date(inquiry.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "inquiry should have valid update timestamp",
    new Date(inquiry.updated_at).getTime() > 0,
  );

  // Step 4: Verify order-specific context and routing
  TestValidator.predicate(
    "order issue inquiry should be properly categorized",
    inquiry.inquiry_type === "order_issue",
  );
  TestValidator.predicate(
    "medium priority indicates standard order issue",
    inquiry.priority === "medium",
  );

  // Additional validation for inquiry data integrity
  TestValidator.notEquals(
    "inquiry ID should not be empty string",
    inquiry.id,
    "",
  );
  TestValidator.predicate(
    "inquiry creation time should be before update time",
    new Date(inquiry.created_at) <= new Date(inquiry.updated_at),
  );

  // Test error scenario: Invalid inquiry type
  await TestValidator.error("should reject invalid inquiry type", async () => {
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: "Test Inquiry",
        body: "Test content",
        inquiry_type: "invalid_type" as any,
        priority: "low",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  });

  // Test error scenario: Missing required fields
  await TestValidator.error(
    "should reject inquiry with missing title",
    async () => {
      await api.functional.shoppingMall.customer.inquiries.create(connection, {
        body: {
          body: "Test content",
          inquiry_type: "order_issue",
          priority: "low",
          status: "open",
        } as any,
      });
    },
  );

  // Validate that order issue inquiries are properly handled
  TestValidator.predicate(
    "order issue inquiry should have sufficient order context",
    inquiry.body.includes("order") ||
      inquiry.body.includes("delivery") ||
      inquiry.body.includes("tracking"),
  );
}
