import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test detailed inquiry retrieval functionality for administrators.
 *
 * This E2E test validates that authorized administrators can access complete
 * inquiry information including title, body content, inquiry type, priority
 * level, status, and timestamps. The test follows a multi-actor workflow
 * involving both customer and administrator roles to ensure proper access
 * controls and comprehensive data retrieval.
 */
export async function test_api_admin_inquiry_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customerPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create a test inquiry as customer
  const inquiryTypes = [
    "product_question",
    "order_issue",
    "account_problem",
    "technical_support",
    "general_feedback",
  ] as const;
  const priorityLevels = ["low", "medium", "high", "critical"] as const;

  const inquiryData = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    inquiry_type: RandomGenerator.pick(inquiryTypes),
    priority: RandomGenerator.pick(priorityLevels),
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const createdInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: inquiryData,
    });
  typia.assert(createdInquiry);

  // Step 3: Switch to administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";

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

  // Authenticate as admin before accessing admin API
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 4: Retrieve inquiry details using admin API
  const retrievedInquiry = await api.functional.shoppingMall.admin.inquiries.at(
    connection,
    {
      inquiryId: createdInquiry.id,
    },
  );
  typia.assert(retrievedInquiry);

  // Step 5: Validate that all inquiry fields are correctly returned
  TestValidator.equals(
    "inquiry ID matches",
    retrievedInquiry.id,
    createdInquiry.id,
  );
  TestValidator.equals(
    "inquiry title matches",
    retrievedInquiry.title,
    inquiryData.title,
  );
  TestValidator.equals(
    "inquiry body matches",
    retrievedInquiry.body,
    inquiryData.body,
  );
  TestValidator.equals(
    "inquiry type matches",
    retrievedInquiry.inquiry_type,
    inquiryData.inquiry_type,
  );
  TestValidator.equals(
    "inquiry priority matches",
    retrievedInquiry.priority,
    inquiryData.priority,
  );
  TestValidator.equals(
    "inquiry status matches",
    retrievedInquiry.status,
    inquiryData.status,
  );

  // Validate timestamp fields exist
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedInquiry.created_at !== null &&
      retrievedInquiry.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedInquiry.updated_at !== null &&
      retrievedInquiry.updated_at !== undefined,
  );

  // Step 6: Test error handling for non-existent inquiry ID
  const nonExistentInquiryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("non-existent inquiry should fail", async () => {
    await api.functional.shoppingMall.admin.inquiries.at(connection, {
      inquiryId: nonExistentInquiryId,
    });
  });
}
