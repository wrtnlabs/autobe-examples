import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test complete inquiry lifecycle workflow from customer submission through
 * administrator status updates. Validates that customers can submit inquiries
 * with initial 'open' status and administrators can properly manage workflow
 * states through valid progression (open → in_progress → awaiting_response →
 * resolved → closed).
 */
export async function test_api_admin_inquiry_update_status_progression(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for inquiry submission
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/inquiry",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Customer creates initial inquiry with 'open' status
  const inquiryData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    inquiry_type: RandomGenerator.pick([
      "product_question",
      "order_issue",
      "account_problem",
      "technical_support",
      "general_feedback",
    ] as const),
    priority: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const initialInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: inquiryData,
    });
  typia.assert(initialInquiry);

  // Validate initial inquiry state
  TestValidator.equals(
    "inquiry should have open status initially",
    initialInquiry.status,
    "open",
  );
  TestValidator.equals(
    "inquiry title should match",
    initialInquiry.title,
    inquiryData.title,
  );
  TestValidator.equals(
    "inquiry body should match",
    initialInquiry.body,
    inquiryData.body,
  );
  TestValidator.equals(
    "inquiry type should match",
    initialInquiry.inquiry_type,
    inquiryData.inquiry_type,
  );
  TestValidator.equals(
    "inquiry priority should match",
    initialInquiry.priority,
    inquiryData.priority,
  );

  // Step 3: Create administrator account for inquiry management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_manage_inquiries: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Administrator updates inquiry status through valid progression
  const validStatusProgression = [
    "in_progress",
    "awaiting_response",
    "resolved",
    "closed",
  ] as const;

  for (const targetStatus of validStatusProgression) {
    const updatedInquiry =
      await api.functional.shoppingMall.admin.inquiries.update(connection, {
        inquiryId: initialInquiry.id,
        body: {
          status: targetStatus,
        } satisfies IShoppingMallInquiry.IUpdate,
      });
    typia.assert(updatedInquiry);

    // Validate status update
    TestValidator.equals(
      `inquiry status should be updated to ${targetStatus}`,
      updatedInquiry.status,
      targetStatus,
    );

    // Validate other fields remain unchanged
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
    TestValidator.equals(
      "inquiry ID should remain the same",
      updatedInquiry.id,
      initialInquiry.id,
    );

    // Validate timestamps are updated appropriately
    TestValidator.predicate(
      "updated_at should be after created_at",
      new Date(updatedInquiry.updated_at) > new Date(initialInquiry.created_at),
    );
  }

  // Step 5: Test invalid status transition (should fail)
  await TestValidator.error(
    "invalid status transition should fail",
    async () => {
      await api.functional.shoppingMall.admin.inquiries.update(connection, {
        inquiryId: initialInquiry.id,
        body: {
          status: "open", // Trying to revert to open from closed - should fail
        } satisfies IShoppingMallInquiry.IUpdate,
      });
    },
  );

  // Step 6: Verify final inquiry state after complete workflow
  const finalInquiry = await api.functional.shoppingMall.admin.inquiries.update(
    connection,
    {
      inquiryId: initialInquiry.id,
      body: {
        status: "closed",
      } satisfies IShoppingMallInquiry.IUpdate,
    },
  );
  typia.assert(finalInquiry);

  TestValidator.equals(
    "final inquiry status should be closed",
    finalInquiry.status,
    "closed",
  );

  // Validate workflow integrity
  TestValidator.predicate(
    "inquiry should have valid workflow completion",
    finalInquiry.status === "closed" &&
      new Date(finalInquiry.updated_at) > new Date(initialInquiry.created_at),
  );

  // Additional validation: Ensure inquiry data integrity throughout the workflow
  TestValidator.equals(
    "inquiry ID should remain consistent throughout workflow",
    finalInquiry.id,
    initialInquiry.id,
  );
  TestValidator.equals(
    "inquiry creation time should remain unchanged",
    finalInquiry.created_at,
    initialInquiry.created_at,
  );
}
