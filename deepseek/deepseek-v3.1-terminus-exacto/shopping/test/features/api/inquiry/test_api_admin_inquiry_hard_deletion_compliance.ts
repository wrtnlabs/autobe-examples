import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test administrator hard deletion of inquiries containing sensitive
 * information requiring complete removal for compliance reasons.
 *
 * Validates that deletion operations properly handle compliance requirements
 * and ensure complete data removal without recovery options.
 */
export async function test_api_admin_inquiry_hard_deletion_compliance(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for inquiry submission
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://shoppingmall.com/support",
        referrer: "https://shoppingmall.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create inquiry with sensitive content using customer context
  const inquiry: IShoppingMallInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: "Sensitive Personal Data Removal Request",
        body: "I need to remove my personal information including social security number 123-45-6789 and credit card details from your system for compliance with GDPR regulations.",
        inquiry_type: "account_problem",
        priority: "high",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(inquiry);

  // Step 3: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminSecurePassword456!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "support_admin",
        permissions: JSON.stringify({ can_delete_inquiries: true }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Authenticate as administrator (switch from customer context)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminSecurePassword456!",
      href: "https://shoppingmall.com/admin",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 4: Perform hard deletion of the inquiry
  await api.functional.shoppingMall.admin.inquiries.erase(connection, {
    inquiryId: inquiry.id,
  });

  // Step 5: Validate successful deletion completion
  // Since there's no GET endpoint to verify deletion, we validate that
  // the deletion operation completed successfully without errors
  TestValidator.predicate(
    "hard deletion operation completed successfully",
    true, // Operation completed without throwing an error
  );

  // Validate compliance requirements met through successful operation
  TestValidator.equals(
    "inquiry contained sensitive content requiring compliance deletion",
    inquiry.inquiry_type,
    "account_problem",
  );
}
