import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Validate administrator ability to escalate inquiry priority levels based on
 * business impact assessment.
 *
 * This test implements a complete workflow where a customer creates an inquiry
 * with 'medium' priority, then an administrator escalates the priority to
 * 'high' and 'critical' levels as the situation requires. The test validates
 * priority reassignment functionality and ensures proper support resource
 * allocation based on urgency levels.
 */
export async function test_api_admin_inquiry_update_priority_escalation(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/customer/join",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Customer creates inquiry with medium priority
  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        inquiry_type: "technical_support",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    },
  );
  typia.assert(inquiry);
  TestValidator.equals(
    "initial priority should be medium",
    inquiry.priority,
    "medium",
  );

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ can_manage_inquiries: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Administrator escalates priority from medium to high
  const updatedToHigh =
    await api.functional.shoppingMall.admin.inquiries.update(connection, {
      inquiryId: inquiry.id,
      body: {
        priority: "high",
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  typia.assert(updatedToHigh);
  TestValidator.equals(
    "priority should be escalated to high",
    updatedToHigh.priority,
    "high",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedToHigh.updated_at,
    inquiry.updated_at,
  );
  TestValidator.equals(
    "inquiry ID should remain consistent",
    updatedToHigh.id,
    inquiry.id,
  );
  TestValidator.equals(
    "title should remain unchanged",
    updatedToHigh.title,
    inquiry.title,
  );
  TestValidator.equals(
    "inquiry type should remain unchanged",
    updatedToHigh.inquiry_type,
    inquiry.inquiry_type,
  );

  // Step 5: Administrator further escalates priority to critical
  const updatedToCritical =
    await api.functional.shoppingMall.admin.inquiries.update(connection, {
      inquiryId: inquiry.id,
      body: {
        priority: "critical",
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  typia.assert(updatedToCritical);
  TestValidator.equals(
    "priority should be escalated to critical",
    updatedToCritical.priority,
    "critical",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change again",
    updatedToCritical.updated_at,
    updatedToHigh.updated_at,
  );
  TestValidator.equals(
    "inquiry ID should remain consistent",
    updatedToCritical.id,
    inquiry.id,
  );
  TestValidator.equals(
    "title should remain unchanged",
    updatedToCritical.title,
    inquiry.title,
  );
  TestValidator.equals(
    "inquiry type should remain unchanged",
    updatedToCritical.inquiry_type,
    inquiry.inquiry_type,
  );

  // Step 6: Validate complete priority escalation workflow
  await TestValidator.predicate(
    "priority escalation workflow completed successfully",
    () =>
      inquiry.priority === "medium" &&
      updatedToHigh.priority === "high" &&
      updatedToCritical.priority === "critical",
  );
}
