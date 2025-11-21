import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test access control mechanisms for inquiry detail retrieval.
 *
 * Validates that administrators can access inquiries created by any customer
 * while ensuring proper role-based permissions are enforced. Tests business
 * logic scenarios for cross-customer inquiry access and authentication context
 * switching.
 */
export async function test_api_admin_inquiry_access_control(
  connection: api.IConnection,
) {
  // Step 1: Create first customer account and inquiry
  const firstCustomerEmail = typia.random<string & tags.Format<"email">>();
  const firstCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: firstCustomerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        href: "https://shoppingmall.com/register",
        referrer: "https://shoppingmall.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(firstCustomer);

  // Create inquiry for first customer
  const firstCustomerInquiry: IShoppingMallInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        inquiry_type: "product_question",
        priority: "medium",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(firstCustomerInquiry);

  // Step 2: Create second customer account and inquiry
  const secondCustomerEmail = typia.random<string & tags.Format<"email">>();
  const secondCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: secondCustomerEmail,
        password: "customer456",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        href: "https://shoppingmall.com/register",
        referrer: "https://shoppingmall.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(secondCustomer);

  // Create inquiry for second customer
  const secondCustomerInquiry: IShoppingMallInquiry =
    await api.functional.shoppingMall.customer.inquiries.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        inquiry_type: "order_issue",
        priority: "high",
        status: "open",
      } satisfies IShoppingMallInquiry.ICreate,
    });
  typia.assert(secondCustomerInquiry);

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({ can_view_inquiries: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 4: Test administrator access to customer inquiries
  // Administrator should be able to access inquiry from first customer
  const retrievedFirstInquiry: IShoppingMallInquiry =
    await api.functional.shoppingMall.admin.inquiries.at(connection, {
      inquiryId: firstCustomerInquiry.id,
    });
  typia.assert(retrievedFirstInquiry);
  TestValidator.equals(
    "admin can access first customer inquiry",
    retrievedFirstInquiry.id,
    firstCustomerInquiry.id,
  );
  TestValidator.equals(
    "inquiry title matches",
    retrievedFirstInquiry.title,
    firstCustomerInquiry.title,
  );
  TestValidator.equals(
    "inquiry type matches",
    retrievedFirstInquiry.inquiry_type,
    firstCustomerInquiry.inquiry_type,
  );

  // Administrator should be able to access inquiry from second customer
  const retrievedSecondInquiry: IShoppingMallInquiry =
    await api.functional.shoppingMall.admin.inquiries.at(connection, {
      inquiryId: secondCustomerInquiry.id,
    });
  typia.assert(retrievedSecondInquiry);
  TestValidator.equals(
    "admin can access second customer inquiry",
    retrievedSecondInquiry.id,
    secondCustomerInquiry.id,
  );
  TestValidator.equals(
    "inquiry priority matches",
    retrievedSecondInquiry.priority,
    secondCustomerInquiry.priority,
  );

  // Step 5: Test business logic validations
  TestValidator.notEquals(
    "different customer inquiries have different IDs",
    firstCustomerInquiry.id,
    secondCustomerInquiry.id,
  );

  TestValidator.predicate(
    "admin has valid authorization token",
    admin.token.access.length > 0,
  );

  TestValidator.predicate(
    "admin token has expiration date",
    admin.token.expired_at.length > 0,
  );

  // Step 6: Test authentication context switching
  // Switch to customer context
  await api.functional.auth.customer.login(connection, {
    body: {
      email: firstCustomerEmail,
      password: "customer123",
      href: "https://shoppingmall.com/login",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Switch back to admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://shoppingmall.com/admin/login",
      referrer: "https://shoppingmall.com/admin",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Final validation: Admin can still access inquiries after context switching
  const finalRetrievedInquiry: IShoppingMallInquiry =
    await api.functional.shoppingMall.admin.inquiries.at(connection, {
      inquiryId: firstCustomerInquiry.id,
    });
  typia.assert(finalRetrievedInquiry);
  TestValidator.equals(
    "admin access persists after context switching",
    finalRetrievedInquiry.id,
    firstCustomerInquiry.id,
  );
  TestValidator.equals(
    "inquiry status remains consistent",
    finalRetrievedInquiry.status,
    firstCustomerInquiry.status,
  );
}
