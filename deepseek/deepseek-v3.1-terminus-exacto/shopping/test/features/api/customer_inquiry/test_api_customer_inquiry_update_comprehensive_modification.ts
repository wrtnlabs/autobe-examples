import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test comprehensive inquiry modification covering multiple fields
 * simultaneously. Customer creates an inquiry, then performs a comprehensive
 * update modifying title, body, inquiry type, priority, and status in a single
 * operation. Validate that multiple field updates are processed correctly and
 * that all modifications are properly reflected in the updated inquiry record.
 */
export async function test_api_customer_inquiry_update_comprehensive_modification(
  connection: api.IConnection,
) {
  // Step 1: Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
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

  // Step 2: Create initial inquiry
  const initialInquiry: IShoppingMallInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        inquiry_type: "product_question",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(initialInquiry);

  // Step 3: Perform comprehensive update with multiple field modifications
  const updatedInquiry: IShoppingMallInquiry =
    await api.functional.shoppingMall.customer.inquiries.update(connection, {
      inquiryId: initialInquiry.id,
      body: {
        title: "Updated: " + RandomGenerator.paragraph({ sentences: 2 }),
        body:
          "Additional details: " + RandomGenerator.content({ paragraphs: 1 }),
        inquiry_type: "technical_support",
        priority: "high",
        status: "in_progress",
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  typia.assert(updatedInquiry);

  // Step 4: Validate comprehensive modifications
  TestValidator.notEquals(
    "title should be updated",
    initialInquiry.title,
    updatedInquiry.title,
  );
  TestValidator.notEquals(
    "body should be updated",
    initialInquiry.body,
    updatedInquiry.body,
  );
  TestValidator.notEquals(
    "inquiry type should be changed",
    initialInquiry.inquiry_type,
    updatedInquiry.inquiry_type,
  );
  TestValidator.notEquals(
    "priority should be escalated",
    initialInquiry.priority,
    updatedInquiry.priority,
  );
  TestValidator.notEquals(
    "status should be progressed",
    initialInquiry.status,
    updatedInquiry.status,
  );

  // Step 5: Verify specific field values
  TestValidator.equals(
    "inquiry type should be technical_support",
    updatedInquiry.inquiry_type,
    "technical_support",
  );
  TestValidator.equals(
    "priority should be high",
    updatedInquiry.priority,
    "high",
  );
  TestValidator.equals(
    "status should be in_progress",
    updatedInquiry.status,
    "in_progress",
  );

  // Step 6: Verify unchanged properties remain intact
  TestValidator.equals(
    "inquiry ID should remain the same",
    updatedInquiry.id,
    initialInquiry.id,
  );
  TestValidator.equals(
    "created_at timestamp should not change",
    updatedInquiry.created_at,
    initialInquiry.created_at,
  );
  TestValidator.predicate(
    "updated_at should reflect modification time",
    new Date(updatedInquiry.updated_at) > new Date(initialInquiry.updated_at),
  );
}
