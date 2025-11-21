import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test adding additional context to an existing inquiry.
 *
 * This test validates that customers can update their inquiries with additional
 * information, clarification details, or follow-up questions. It ensures the
 * system properly handles inquiry content updates while maintaining
 * conversation continuity and preserving the original inquiry structure.
 */
export async function test_api_customer_inquiry_update_additional_context(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial inquiry
  const initialInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
        inquiry_type: "product_question",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(initialInquiry);

  // Step 3: Update inquiry with additional context
  const additionalContext =
    " Additional details: I need more information about the product specifications and warranty terms.";
  const updatedBody = initialInquiry.body + additionalContext;

  const updatedInquiry =
    await api.functional.shoppingMall.customer.inquiries.update(connection, {
      inquiryId: initialInquiry.id,
      body: {
        body: updatedBody,
      } satisfies IShoppingMallInquiry.IUpdate,
    });
  typia.assert(updatedInquiry);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "inquiry ID should remain the same",
    updatedInquiry.id,
    initialInquiry.id,
  );

  TestValidator.equals(
    "inquiry body should contain the additional context",
    updatedInquiry.body,
    updatedBody,
  );

  TestValidator.equals(
    "inquiry title should remain unchanged",
    updatedInquiry.title,
    initialInquiry.title,
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
    "inquiry status should remain unchanged",
    updatedInquiry.status,
    initialInquiry.status,
  );

  TestValidator.predicate(
    "updated timestamp should be more recent than creation timestamp",
    new Date(updatedInquiry.updated_at) > new Date(initialInquiry.created_at),
  );
}
