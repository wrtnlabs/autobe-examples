import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test administrator ability to modify inquiry content for clarification and
 * additional context.
 *
 * This test validates the complete workflow of customer inquiry submission
 * followed by administrator content modification. It ensures that
 * administrators can effectively update inquiry details to improve clarity and
 * support resolution efficiency while maintaining proper audit trail
 * integrity.
 *
 * Workflow:
 *
 * 1. Customer account creation and authentication
 * 2. Customer submits initial inquiry with specific details
 * 3. Administrator account creation and authentication
 * 4. Administrator updates inquiry with improved title and body content
 * 5. Validation of field-level update capabilities and data integrity
 */
export async function test_api_admin_inquiry_update_content_modification(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Customer submits initial inquiry
  const initialInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        inquiry_type: "technical_support",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(initialInquiry);

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ can_manage_inquiries: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Administrator updates inquiry content
  const updatedInquiry =
    await api.functional.shoppingMall.admin.inquiries.update(connection, {
      inquiryId: initialInquiry.id,
      body: {
        title: "Clarified: " + initialInquiry.title,
        body:
          initialInquiry.body +
          "\n\nAdditional context added by support team for better resolution.",
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  typia.assert(updatedInquiry);

  // Step 5: Validate updates were applied correctly
  TestValidator.equals(
    "inquiry ID remains unchanged",
    updatedInquiry.id,
    initialInquiry.id,
  );
  TestValidator.notEquals(
    "title should be updated",
    updatedInquiry.title,
    initialInquiry.title,
  );
  TestValidator.notEquals(
    "body should be updated",
    updatedInquiry.body,
    initialInquiry.body,
  );
  TestValidator.equals(
    "inquiry type remains unchanged",
    updatedInquiry.inquiry_type,
    initialInquiry.inquiry_type,
  );
  TestValidator.equals(
    "priority remains unchanged",
    updatedInquiry.priority,
    initialInquiry.priority,
  );
  TestValidator.equals(
    "status remains unchanged",
    updatedInquiry.status,
    initialInquiry.status,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedInquiry.created_at,
    initialInquiry.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedInquiry.updated_at,
    initialInquiry.updated_at,
  );

  // Validate title modification
  TestValidator.predicate(
    "updated title includes clarification prefix",
    updatedInquiry.title.startsWith("Clarified: "),
  );

  // Validate body modification
  TestValidator.predicate(
    "updated body includes additional context",
    updatedInquiry.body.includes("Additional context added by support team"),
  );
  TestValidator.predicate(
    "updated body contains original content",
    updatedInquiry.body.includes(initialInquiry.body.substring(0, 50)),
  );

  // Step 6: Test unauthorized access attempt
  // Create unauthorized connection by clearing headers
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized user cannot update inquiry",
    async () => {
      await api.functional.shoppingMall.admin.inquiries.update(
        unauthorizedConnection,
        {
          inquiryId: initialInquiry.id,
          body: {
            title: "Unauthorized update attempt",
          } satisfies IShoppingMallInquiry.IUpdate,
        },
      );
    },
  );

  // Step 7: Test updating non-existent inquiry
  const nonExistentInquiryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("cannot update non-existent inquiry", async () => {
    await api.functional.shoppingMall.admin.inquiries.update(connection, {
      inquiryId: nonExistentInquiryId,
      body: {
        title: "Update attempt on non-existent inquiry",
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  });
}
