import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test inquiry creation with critical priority level for urgent platform
 * issues.
 *
 * This test validates that customers can submit critical priority inquiries for
 * technical support issues requiring immediate attention. The workflow includes
 * customer registration followed by inquiry submission with critical priority,
 * ensuring proper flagging for rapid response and sufficient urgency context.
 */
export async function test_api_customer_inquiry_creation_critical_priority(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "securePassword123";

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

  // Step 2: Create critical priority inquiry for urgent technical support
  const inquiryData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    inquiry_type: "technical_support" as const,
    priority: "critical" as const,
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    { body: inquiryData },
  );
  typia.assert(inquiry);

  // Step 3: Validate critical priority inquiry properties
  TestValidator.equals(
    "inquiry title should match input data",
    inquiry.title,
    inquiryData.title,
  );

  TestValidator.equals(
    "inquiry body should match input data",
    inquiry.body,
    inquiryData.body,
  );

  TestValidator.equals(
    "inquiry type should be technical_support",
    inquiry.inquiry_type,
    "technical_support",
  );

  TestValidator.equals(
    "inquiry priority should be critical",
    inquiry.priority,
    "critical",
  );

  TestValidator.equals("inquiry status should be open", inquiry.status, "open");

  TestValidator.predicate(
    "inquiry should have valid creation timestamp",
    inquiry.created_at !== null && inquiry.created_at !== undefined,
  );

  TestValidator.predicate(
    "inquiry should have valid update timestamp",
    inquiry.updated_at !== null && inquiry.updated_at !== undefined,
  );

  TestValidator.equals(
    "new inquiry should not have deletion timestamp",
    inquiry.deleted_at,
    undefined,
  );
}
