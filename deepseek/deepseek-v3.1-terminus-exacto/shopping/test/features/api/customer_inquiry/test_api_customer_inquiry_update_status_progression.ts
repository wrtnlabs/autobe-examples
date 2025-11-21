import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test inquiry status progression through workflow states.
 *
 * Customer creates an inquiry and updates its status through various workflow
 * stages (open → in_progress → awaiting_response → resolved → closed). Validate
 * that status transitions follow logical progression rules and that each status
 * change is properly recorded. Verify that the system maintains workflow
 * integrity throughout the inquiry lifecycle.
 */
export async function test_api_customer_inquiry_update_status_progression(
  connection: api.IConnection,
) {
  // Step 1: Create customer account and establish authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial inquiry for status update testing
  const inquiryTypes = [
    "product_question",
    "order_issue",
    "account_problem",
    "technical_support",
    "general_feedback",
  ] as const;
  const priorities = ["low", "medium", "high", "critical"] as const;

  const initialInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 8,
        }),
        inquiry_type: RandomGenerator.pick(inquiryTypes),
        priority: RandomGenerator.pick(priorities),
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(initialInquiry);

  // Step 3: Test status progression through workflow stages
  const workflowStages = [
    "in_progress",
    "awaiting_response",
    "resolved",
    "closed",
  ] as const;

  let previousInquiry = initialInquiry;

  for (const targetStatus of workflowStages) {
    // Update inquiry status to the next workflow stage
    const updatedInquiry =
      await api.functional.shoppingMall.customer.inquiries.update(connection, {
        inquiryId: previousInquiry.id,
        body: {
          status: targetStatus,
        } satisfies IShoppingMallInquiry.IUpdate,
      });
    typia.assert(updatedInquiry);

    // Validate that status was updated correctly
    TestValidator.equals(
      `inquiry status should be ${targetStatus}`,
      updatedInquiry.status,
      targetStatus,
    );

    // Validate that updated_at timestamp is newer than previous update
    TestValidator.predicate(
      `updated_at should be newer after ${targetStatus} update`,
      new Date(updatedInquiry.updated_at) >
        new Date(previousInquiry.updated_at),
    );

    // Validate that core inquiry data remains consistent
    TestValidator.equals(
      "inquiry ID should remain consistent",
      updatedInquiry.id,
      initialInquiry.id,
    );
    TestValidator.equals(
      "inquiry title should remain unchanged",
      updatedInquiry.title,
      initialInquiry.title,
    );
    TestValidator.equals(
      "inquiry body should remain unchanged",
      updatedInquiry.body,
      initialInquiry.body,
    );
    TestValidator.equals(
      "inquiry type should remain unchanged",
      updatedInquiry.inquiry_type,
      initialInquiry.inquiry_type,
    );
    TestValidator.equals(
      "inquiry priority should remain unchanged",
      updatedInquiry.priority,
      initialInquiry.priority,
    );

    // Update previous inquiry reference for next iteration
    previousInquiry = updatedInquiry;
  }

  // Final validation - the last update should have closed status
  TestValidator.equals(
    "final inquiry status should be closed",
    previousInquiry.status,
    "closed",
  );
  TestValidator.predicate(
    "final updated_at should be the most recent",
    new Date(previousInquiry.updated_at) > new Date(initialInquiry.created_at),
  );

  // Validate comprehensive data integrity
  TestValidator.equals(
    "inquiry ID consistency throughout workflow",
    previousInquiry.id,
    initialInquiry.id,
  );
  TestValidator.equals(
    "title consistency throughout workflow",
    previousInquiry.title,
    initialInquiry.title,
  );
  TestValidator.equals(
    "body consistency throughout workflow",
    previousInquiry.body,
    initialInquiry.body,
  );
  TestValidator.equals(
    "inquiry type consistency throughout workflow",
    previousInquiry.inquiry_type,
    initialInquiry.inquiry_type,
  );
  TestValidator.equals(
    "priority consistency throughout workflow",
    previousInquiry.priority,
    initialInquiry.priority,
  );
}
