import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test inquiry type reclassification when the nature of the issue changes.
 * Customer creates an inquiry with one type (e.g., product_question) but later
 * updates it to a different type (e.g., technical_support) as the issue
 * evolves. Validate that type reclassification is properly handled and that the
 * inquiry is correctly rerouted to appropriate support channels. Verify that
 * the system maintains inquiry continuity despite type changes.
 */
export async function test_api_customer_inquiry_update_type_reclassification(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testpassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/inquiry",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial inquiry with product_question type
  const initialInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        inquiry_type: "product_question",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(initialInquiry);

  // Validate initial inquiry state
  TestValidator.equals(
    "initial inquiry should have product_question type",
    initialInquiry.inquiry_type,
    "product_question",
  );

  TestValidator.equals(
    "initial inquiry should have open status",
    initialInquiry.status,
    "open",
  );

  // Step 3: Update inquiry to change type to technical_support
  const updatedInquiry =
    await api.functional.shoppingMall.customer.inquiries.update(connection, {
      inquiryId: initialInquiry.id,
      body: {
        inquiry_type: "technical_support",
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  typia.assert(updatedInquiry);

  // Step 4: Validate inquiry continuity and type reclassification
  TestValidator.equals(
    "inquiry ID should remain consistent after type change",
    updatedInquiry.id,
    initialInquiry.id,
  );

  TestValidator.equals(
    "inquiry type should be updated to technical_support",
    updatedInquiry.inquiry_type,
    "technical_support",
  );

  TestValidator.notEquals(
    "updated_at timestamp should change after modification",
    updatedInquiry.updated_at,
    initialInquiry.updated_at,
  );

  TestValidator.equals(
    "title should remain unchanged unless explicitly modified",
    updatedInquiry.title,
    initialInquiry.title,
  );

  TestValidator.equals(
    "body should remain unchanged unless explicitly modified",
    updatedInquiry.body,
    initialInquiry.body,
  );

  TestValidator.equals(
    "priority should remain unchanged unless explicitly modified",
    updatedInquiry.priority,
    initialInquiry.priority,
  );

  TestValidator.equals(
    "status should remain unchanged unless explicitly modified",
    updatedInquiry.status,
    initialInquiry.status,
  );

  TestValidator.equals(
    "created_at timestamp should remain consistent",
    updatedInquiry.created_at,
    initialInquiry.created_at,
  );

  // Additional validation for type reclassification business logic
  TestValidator.predicate(
    "inquiry type should be successfully changed from product_question to technical_support",
    initialInquiry.inquiry_type === "product_question" &&
      updatedInquiry.inquiry_type === "technical_support",
  );

  TestValidator.predicate(
    "inquiry workflow continuity should be maintained",
    updatedInquiry.id === initialInquiry.id &&
      updatedInquiry.created_at === initialInquiry.created_at &&
      updatedInquiry.title === initialInquiry.title &&
      updatedInquiry.body === initialInquiry.body,
  );

  // Validate that the type change represents a valid reclassification scenario
  const validTypeTransition =
    initialInquiry.inquiry_type === "product_question" &&
    updatedInquiry.inquiry_type === "technical_support";

  TestValidator.predicate(
    "type change should represent valid reclassification scenario",
    validTypeTransition,
  );
}
