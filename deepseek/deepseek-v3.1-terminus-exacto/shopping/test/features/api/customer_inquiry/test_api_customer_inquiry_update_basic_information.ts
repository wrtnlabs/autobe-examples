import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test the complete workflow of a customer updating their existing inquiry with
 * new information.
 *
 * This test validates the customer inquiry update functionality by:
 *
 * 1. Creating a customer account through authentication
 * 2. Submitting an initial inquiry with specific details
 * 3. Updating the inquiry with new title, description, and potentially other
 *    fields
 * 4. Verifying that the update preserves original metadata while reflecting
 *    changes
 *
 * The test ensures that timestamps are properly managed, workflow progression
 * is maintained, and the inquiry maintains its integrity throughout the update
 * process.
 */
export async function test_api_customer_inquiry_update_basic_information(
  connection: api.IConnection,
) {
  // Step 1: Customer Registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.com/register",
      referrer: "https://shopping-mall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create Initial Inquiry
  const initialInquiryData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    inquiry_type: "technical_support" as const,
    priority: "medium" as const,
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const initialInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: initialInquiryData,
    });
  typia.assert(initialInquiry);

  // Validate initial inquiry creation
  TestValidator.equals(
    "inquiry title matches initial data",
    initialInquiry.title,
    initialInquiryData.title,
  );
  TestValidator.equals(
    "inquiry body matches initial data",
    initialInquiry.body,
    initialInquiryData.body,
  );
  TestValidator.equals(
    "inquiry type matches initial data",
    initialInquiry.inquiry_type,
    initialInquiryData.inquiry_type,
  );
  TestValidator.equals(
    "inquiry priority matches initial data",
    initialInquiry.priority,
    initialInquiryData.priority,
  );
  TestValidator.equals(
    "inquiry status matches initial data",
    initialInquiry.status,
    initialInquiryData.status,
  );

  // Step 3: Update Inquiry with New Information
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    inquiry_type: "order_issue" as const,
    priority: "high" as const,
  } satisfies IShoppingMallInquiry.IUpdate;

  const updatedInquiry =
    await api.functional.shoppingMall.customer.inquiries.update(connection, {
      inquiryId: initialInquiry.id,
      body: updateData,
    });
  typia.assert(updatedInquiry);

  // Step 4: Validate Update Results

  // Verify updated fields
  TestValidator.equals(
    "title should be updated",
    updatedInquiry.title,
    updateData.title,
  );
  TestValidator.equals(
    "body should be updated",
    updatedInquiry.body,
    updateData.body,
  );
  TestValidator.equals(
    "inquiry type should be updated",
    updatedInquiry.inquiry_type,
    updateData.inquiry_type,
  );
  TestValidator.equals(
    "priority should be updated",
    updatedInquiry.priority,
    updateData.priority,
  );

  // Verify preserved metadata
  TestValidator.equals(
    "inquiry ID should remain unchanged",
    updatedInquiry.id,
    initialInquiry.id,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedInquiry.created_at,
    initialInquiry.created_at,
  );

  // Verify updated timestamp is newer
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedInquiry.updated_at) > new Date(initialInquiry.created_at),
  );

  // Verify no deletion occurred
  TestValidator.equals(
    "deleted_at should remain undefined",
    updatedInquiry.deleted_at,
    undefined,
  );
}
