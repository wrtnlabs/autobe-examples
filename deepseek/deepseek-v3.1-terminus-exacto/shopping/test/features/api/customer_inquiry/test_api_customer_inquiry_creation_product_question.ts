import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Validates the creation of product-related customer inquiries in the shopping
 * mall platform.
 *
 * This test follows a complete business workflow:
 *
 * 1. Customer registration through authentication join
 * 2. Product inquiry creation with 'product_question' categorization
 * 3. Validation of inquiry categorization, priority assignment, and data integrity
 *
 * The test ensures that product-related inquiries are properly categorized and
 * routed to appropriate support channels with sufficient detail for product
 * specialists.
 */
export async function test_api_customer_inquiry_creation_product_question(
  connection: api.IConnection,
) {
  // Step 1: Customer registration - establish authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create product-related inquiry
  const inquiryTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const inquiryBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });

  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    {
      body: {
        title: inquiryTitle,
        body: inquiryBody,
        inquiry_type: "product_question",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    },
  );
  typia.assert(inquiry);

  // Step 3: Validate inquiry creation and categorization
  TestValidator.equals(
    "inquiry type should be product_question",
    inquiry.inquiry_type,
    "product_question",
  );
  TestValidator.equals(
    "inquiry title should match input",
    inquiry.title,
    inquiryTitle,
  );
  TestValidator.equals(
    "inquiry body should match input",
    inquiry.body,
    inquiryBody,
  );
  TestValidator.equals(
    "inquiry priority should be medium",
    inquiry.priority,
    "medium",
  );
  TestValidator.equals("inquiry status should be open", inquiry.status, "open");

  // Step 4: Test error scenario - duplicate inquiry creation should fail
  await TestValidator.error(
    "creating duplicate inquiry should fail",
    async () => {
      await api.functional.shoppingMall.customer.inquiries.create(connection, {
        body: {
          title: inquiryTitle,
          body: inquiryBody,
          inquiry_type: "product_question",
          priority: "medium",
          status: "open",
        } satisfies IShoppingMallInquiry.ICreate,
      });
    },
  );
}
