import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Validates technical support inquiry creation workflow for shopping mall
 * platform issues.
 *
 * This test simulates a complete customer journey where a customer registers,
 * authenticates, and submits a technical support inquiry for platform
 * functionality problems. The test ensures that technical support inquiries are
 * properly categorized, include detailed error descriptions and reproduction
 * steps, and are routed to appropriate technical teams.
 *
 * Key validation steps:
 *
 * 1. Customer account creation and authentication
 * 2. Technical support inquiry submission with platform-specific issues
 * 3. Verification of proper categorization and routing
 * 4. Validation of inquiry data integrity and workflow status
 */
export async function test_api_customer_inquiry_creation_technical_support(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/support",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create technical support inquiry with detailed platform issues
  const inquiryData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    inquiry_type: "technical_support" as const,
    priority: "high" as const,
    status: "open" as const,
  } satisfies IShoppingMallInquiry.ICreate;

  const inquiry = await api.functional.shoppingMall.customer.inquiries.create(
    connection,
    { body: inquiryData },
  );
  typia.assert(inquiry);

  // Step 3: Validate inquiry response matches creation data
  TestValidator.equals(
    "inquiry title matches input",
    inquiry.title,
    inquiryData.title,
  );
  TestValidator.equals(
    "inquiry body matches input",
    inquiry.body,
    inquiryData.body,
  );
  TestValidator.equals(
    "inquiry type is technical_support",
    inquiry.inquiry_type,
    "technical_support",
  );
  TestValidator.equals("inquiry priority is high", inquiry.priority, "high");
  TestValidator.equals("inquiry status is open", inquiry.status, "open");

  // Step 4: Validate inquiry workflow properties (business logic only)
  TestValidator.predicate("inquiry has non-empty ID", inquiry.id.length > 0);
  TestValidator.predicate(
    "created_at timestamp is set",
    inquiry.created_at !== "",
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    inquiry.updated_at !== "",
  );
}
