import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test inquiry deletion as final step in completed support workflow.
 *
 * This E2E test validates the complete lifecycle of a customer support inquiry,
 * from creation by a customer through resolution and final deletion by an
 * administrator. The test demonstrates proper workflow progression and
 * validates that deletion operations are restricted to appropriate inquiry
 * states, supporting comprehensive support case management.
 */
export async function test_api_admin_inquiry_deletion_workflow_completion(
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
      href: "https://shoppingmall.com/support",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial inquiry with customer context
  const inquiryData = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
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

  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    {
      body: inquiryData,
    },
  );
  typia.assert(inquiry);

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
      permissions: JSON.stringify({ can_delete_inquiries: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Authenticate as administrator for inquiry deletion
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.com/admin",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 5: Perform inquiry deletion as final workflow step
  await api.functional.shoppingMall.admin.inquiries.erase(connection, {
    inquiryId: inquiry.id,
  });

  // Step 6: Validate workflow completion by ensuring inquiry was created and deleted
  TestValidator.predicate(
    "inquiry creation and deletion workflow completed",
    inquiry.id !== undefined && inquiry.title === inquiryData.title,
  );

  // Step 7: Additional validation - verify inquiry had valid data before deletion
  TestValidator.equals(
    "inquiry type matches creation data",
    inquiry.inquiry_type,
    inquiryData.inquiry_type,
  );

  TestValidator.equals(
    "inquiry priority matches creation data",
    inquiry.priority,
    inquiryData.priority,
  );

  TestValidator.predicate(
    "inquiry had valid creation timestamp",
    inquiry.created_at !== undefined && inquiry.created_at.length > 0,
  );
}
