import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test comprehensive inquiry data retrieval including all supported fields and
 * relationships. Validate that the system returns complete inquiry information
 * with proper field formatting and data integrity. Verify that timestamps are
 * correctly formatted, inquiry types are properly categorized, priority levels
 * are accurately represented, and status values reflect the current workflow
 * state.
 */
export async function test_api_admin_inquiry_comprehensive_data(
  connection: api.IConnection,
) {
  // 1. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/customer/dashboard",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create test inquiry with comprehensive data
  const inquiryTypes = [
    "product_question",
    "order_issue",
    "account_problem",
    "technical_support",
    "general_feedback",
  ] as const;
  const priorityLevels = ["low", "medium", "high", "critical"] as const;

  const inquiryData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    inquiry_type: RandomGenerator.pick(inquiryTypes),
    priority: RandomGenerator.pick(priorityLevels),
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const createdInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: inquiryData,
    });
  typia.assert(createdInquiry);

  // 3. Switch to administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_view_inquiries: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 4. Retrieve inquiry using admin API
  const retrievedInquiry = await api.functional.shoppingMall.admin.inquiries.at(
    connection,
    {
      inquiryId: createdInquiry.id,
    },
  );
  typia.assert(retrievedInquiry);

  // 5. Validate comprehensive data integrity
  TestValidator.equals(
    "inquiry ID matches",
    retrievedInquiry.id,
    createdInquiry.id,
  );
  TestValidator.equals(
    "title matches submitted content",
    retrievedInquiry.title,
    inquiryData.title,
  );
  TestValidator.equals(
    "body matches submitted content",
    retrievedInquiry.body,
    inquiryData.body,
  );
  TestValidator.equals(
    "inquiry type matches",
    retrievedInquiry.inquiry_type,
    inquiryData.inquiry_type,
  );
  TestValidator.equals(
    "priority level matches",
    retrievedInquiry.priority,
    inquiryData.priority,
  );
  TestValidator.equals("status is open", retrievedInquiry.status, "open");

  // Validate timestamp formats using typia.assert for proper format validation
  typia.assert<string & tags.Format<"date-time">>(retrievedInquiry.created_at);
  typia.assert<string & tags.Format<"date-time">>(retrievedInquiry.updated_at);

  // Validate UUID format using typia.assert
  typia.assert<string & tags.Format<"uuid">>(retrievedInquiry.id);
}
