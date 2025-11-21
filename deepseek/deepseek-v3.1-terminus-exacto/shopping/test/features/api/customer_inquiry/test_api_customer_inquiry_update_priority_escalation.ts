import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test customer inquiry priority escalation workflow.
 *
 * Validates that customers can create inquiries with standard priority and
 * subsequently escalate to higher priority levels when urgency increases.
 * Ensures the system correctly handles priority changes while maintaining
 * inquiry content integrity and proper workflow progression.
 */
export async function test_api_customer_inquiry_update_priority_escalation(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

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

  // Step 2: Create initial inquiry with standard priority
  const initialInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 8,
          wordMin: 4,
          wordMax: 10,
        }),
        inquiry_type: "order_issue",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(initialInquiry);

  // Validate initial inquiry properties
  TestValidator.equals(
    "inquiry should have medium priority initially",
    initialInquiry.priority,
    "medium",
  );
  TestValidator.equals(
    "inquiry should be in open status",
    initialInquiry.status,
    "open",
  );
  TestValidator.equals(
    "inquiry type should be order_issue",
    initialInquiry.inquiry_type,
    "order_issue",
  );

  // Step 3: Escalate priority to high due to increased urgency
  const escalatedInquiry =
    await api.functional.shoppingMall.customer.inquiries.update(connection, {
      inquiryId: initialInquiry.id,
      body: {
        priority: "high",
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  typia.assert(escalatedInquiry);

  // Step 4: Validate priority escalation
  TestValidator.equals(
    "priority should be escalated to high",
    escalatedInquiry.priority,
    "high",
  );
  TestValidator.equals(
    "inquiry ID should remain unchanged",
    escalatedInquiry.id,
    initialInquiry.id,
  );
  TestValidator.equals(
    "title should remain unchanged",
    escalatedInquiry.title,
    initialInquiry.title,
  );
  TestValidator.equals(
    "body should remain unchanged",
    escalatedInquiry.body,
    initialInquiry.body,
  );
  TestValidator.equals(
    "inquiry type should remain unchanged",
    escalatedInquiry.inquiry_type,
    initialInquiry.inquiry_type,
  );
  TestValidator.equals(
    "status should remain open",
    escalatedInquiry.status,
    "open",
  );

  // Additional validation: Ensure timestamps are properly updated
  TestValidator.notEquals(
    "updated_at timestamp should change after priority update",
    escalatedInquiry.updated_at,
    initialInquiry.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    escalatedInquiry.created_at,
    initialInquiry.created_at,
  );

  // Step 5: Test further escalation to critical priority
  const criticalInquiry =
    await api.functional.shoppingMall.customer.inquiries.update(connection, {
      inquiryId: initialInquiry.id,
      body: {
        priority: "critical",
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  typia.assert(criticalInquiry);

  // Validate critical priority escalation
  TestValidator.equals(
    "priority should be escalated to critical",
    criticalInquiry.priority,
    "critical",
  );
  TestValidator.equals(
    "inquiry ID should remain unchanged",
    criticalInquiry.id,
    initialInquiry.id,
  );

  // Final validation: Ensure all core properties remain intact through multiple updates
  TestValidator.equals(
    "title should remain consistent through all updates",
    criticalInquiry.title,
    initialInquiry.title,
  );
  TestValidator.equals(
    "body should remain consistent through all updates",
    criticalInquiry.body,
    initialInquiry.body,
  );
  TestValidator.equals(
    "inquiry type should remain consistent",
    criticalInquiry.inquiry_type,
    initialInquiry.inquiry_type,
  );
}
