import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

export async function test_api_customer_join_initializes_customer_status_and_email_verification_flags(
  connection: api.IConnection,
) {
  // 1. Prepare random customer registration payload
  const joinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  // 2. Call customer join endpoint
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Basic identity checks
  TestValidator.equals(
    "customer email in authorized payload equals requested email",
    customerAuthorized.email,
    joinBody.email,
  );

  // 4. Business invariant: initial email_verified should be false
  TestValidator.equals(
    "newly joined customer must have email_verified = false",
    customerAuthorized.email_verified,
    false,
  );

  // 5. Business invariant: status should be a non-empty string
  TestValidator.predicate(
    "customer status should be a non-empty string",
    customerAuthorized.status.length > 0,
  );

  // 6. Business invariant: customer must not be soft-deleted on join
  TestValidator.equals(
    "deleted_at must be null for a newly joined customer (authorized payload)",
    customerAuthorized.deleted_at ?? null,
    null,
  );

  // 7. Type-level sanity for timestamps
  TestValidator.predicate(
    "created_at should be a non-empty string",
    customerAuthorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    customerAuthorized.updated_at.length > 0,
  );

  // 8. last_login_at for a brand-new account: allow null or undefined
  TestValidator.predicate(
    "last_login_at should be null or undefined for a newly joined customer",
    customerAuthorized.last_login_at === null ||
      customerAuthorized.last_login_at === undefined,
  );

  // 9. Elevate to admin: join as admin to use admin customer detail endpoint
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 10. Admin fetches the persisted customer row via detail endpoint
  const adminViewCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId: customerAuthorized.id,
    });
  typia.assert(adminViewCustomer);

  // 11. Cross-validate core identity fields between authorized payload and admin detail
  TestValidator.equals(
    "customer id must match between authorized payload and admin detail view",
    adminViewCustomer.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "customer email must match between authorized payload and admin detail view",
    adminViewCustomer.email,
    customerAuthorized.email,
  );

  // 12. Cross-validate status and email_verified flags
  TestValidator.equals(
    "customer status must match between authorized payload and admin detail view",
    adminViewCustomer.status,
    customerAuthorized.status,
  );
  TestValidator.equals(
    "email_verified must be false and consistent across views",
    adminViewCustomer.email_verified,
    customerAuthorized.email_verified,
  );

  // 13. Confirm persisted email_verified is still false
  TestValidator.equals(
    "persisted customer email_verified should be false on initial join",
    adminViewCustomer.email_verified,
    false,
  );

  // 14. Cross-validate soft-delete flag
  TestValidator.equals(
    "deleted_at must be null in both authorized payload and admin detail view",
    adminViewCustomer.deleted_at ?? null,
    customerAuthorized.deleted_at ?? null,
  );

  // 15. Cross-validate creation and update timestamps for consistency
  TestValidator.equals(
    "created_at should be the same between authorized payload and admin detail view",
    adminViewCustomer.created_at,
    customerAuthorized.created_at,
  );
  TestValidator.equals(
    "updated_at should be the same between authorized payload and admin detail view",
    adminViewCustomer.updated_at,
    customerAuthorized.updated_at,
  );
}
