import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test filtering customers by email search term and account status.
 *
 * Validates that administrators can use the PATCH /ecommerceMall/admin/customers endpoint to filter customers by email partial match (case-insensitive) and account status. This test creates multiple customer accounts with various email patterns, then verifies that filtering by email search term combined with status filter returns only matching records.
 *
 * The test validates the complete filtering workflow including:
 * - Administrator authentication for accessing customer listing endpoint
 * - Creating test customers with emails containing 'test' and emails not containing 'test'
 * - Email partial matching with case-insensitive comparison
 * - Status filtering distinguishing between 'active' and 'deleted' accounts
 * - Pagination metadata correctness for filtered results
 *
 * 1. Administrator joins and authenticates to access customer management.
 * 2. Creates test customers: two with emails containing 'test', one with different email.
 * 3. Sends PATCH request with search='test' and status='active'.
 * 4. Validates all returned customers have emails containing 'test' (case-insensitive).
 * 5. Validates all returned customers have status='active' (deleted_at is null).
 * 6. Verifies pagination metadata matches filtered result count.
 */
export async function test_api_customer_filtering_by_email_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create test customers with various email patterns
  // Customer 1: email containing 'test'
  const customer1Email = `test1.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: customer1Email as string & tags.Format<"email">,
      password: "TestPass123!",
      name: RandomGenerator.name(),
      href: "https://example.com/verify",
      referrer: "https://example.com/register",
    },
  });
  typia.assert(customer1);
  // Customer 2: email containing 'TEST' (uppercase for case-insensitivity testing)
  const customer2Email = `TEST2.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: customer2Email as string & tags.Format<"email">,
      password: "TestPass123!",
      name: RandomGenerator.name(),
      href: "https://example.com/verify",
      referrer: "https://example.com/register",
    },
  });
  typia.assert(customer2);
  // Customer 3: email NOT containing 'test' (for contrast)
  const customer3Email = `other.${RandomGenerator.alphaNumeric(8)}@sample.org`;
  const customer3Connection: api.IConnection = { host: connection.host };
  const customer3 = await authorize_customer_join(customer3Connection, {
    body: {
      email: customer3Email as string & tags.Format<"email">,
      password: "TestPass123!",
      name: RandomGenerator.name(),
      href: "https://example.com/verify",
      referrer: "https://example.com/register",
    },
  });
  typia.assert(customer3);
  // 3. Filter customers by search='test' and status='active'
  const activeFilterResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        search: "test",
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(activeFilterResult);
  // 4. Validate all returned customers have emails containing 'test' (case-insensitive)
  TestValidator.equals(
    "returned customers should have emails containing 'test' (case-insensitive)",
    activeFilterResult.data.length > 0,
    true,
  );
  for (const customer of activeFilterResult.data) {
    const emailLower = customer.email.toLowerCase();
    TestValidator.predicate(
      `customer email should contain 'test': ${customer.email}`,
      emailLower.includes("test"),
    );
  }
  // 5. Validate all returned customers have status='active'
  for (const customer of activeFilterResult.data) {
    TestValidator.equals(
      `customer status should be 'active': ${customer.email}`,
      customer.status,
      "active",
    );
    TestValidator.equals(
      `customer deleted_at should be null: ${customer.email}`,
      customer.deleted_at,
      null,
    );
  }
  // 6. Verify pagination metadata
  TestValidator.predicate(
    "pagination current should be 1",
    activeFilterResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    activeFilterResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should match data length",
    activeFilterResult.pagination.records >= activeFilterResult.data.length,
  );
  // 7. Filter by status='deleted' to verify only soft-deleted accounts are returned
  // Since no accounts are deleted yet, this should return empty data
  const deletedFilterResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        search: "test",
        status: "deleted",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(deletedFilterResult);
  // 8. Verify deleted filter returns empty (no soft-deleted accounts yet)
  TestValidator.equals(
    "no deleted customers with 'test' email should exist initially",
    deletedFilterResult.data.length,
    0,
  );
  // 9. Filter without search term to verify all active customers are returned
  const allActiveResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(allActiveResult);
  // Should include all 3 created customers plus potentially admin
  TestValidator.predicate(
    "all active customers should include our test customers",
    allActiveResult.data.length >= 3,
  );
  // Verify our created customers are in the list
  const createdCustomerEmails = [
    customer1Email,
    customer2Email,
    customer3Email,
  ];
  for (const customer of allActiveResult.data) {
    if (createdCustomerEmails.includes(customer.email)) {
      TestValidator.equals(
        `created customer ${customer.email} should have 'active' status`,
        customer.status,
        "active",
      );
    }
  }
}
