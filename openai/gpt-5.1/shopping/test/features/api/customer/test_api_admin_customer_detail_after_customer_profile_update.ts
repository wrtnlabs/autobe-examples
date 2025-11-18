import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

/**
 * Validate that customer profile updates are reflected in the admin customer
 * detail view.
 *
 * Business context:
 *
 * - A shopping mall platform exposes both customer-facing and admin-facing APIs.
 * - Customers can update their own core account fields via a customer endpoint.
 * - Admins inspect customer accounts via an admin detail endpoint backed by the
 *   same `shopping_mall_customers` source of truth.
 *
 * This E2E scenario verifies that when a customer updates their own account,
 * the corresponding admin detail view reflects the updated values, including
 * timestamps.
 *
 * High-level steps:
 *
 * 1. Create an admin account via /auth/admin/join.
 * 2. Create a customer account via /auth/customer/join and capture the created
 *    state.
 * 3. As the customer, update mutable fields via
 *    /shoppingMall/customer/customers/{customerId}.
 * 4. As the admin, fetch the same customer via
 *    /shoppingMall/admin/customers/{customerId}.
 * 5. Assert that admin-view data matches the updated customer state and timestamps
 *    are consistent.
 */
export async function test_api_admin_customer_detail_after_customer_profile_update(
  connection: api.IConnection,
) {
  // 1. Admin joins (creates admin actor)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Customer joins (creates customer actor)
  const customerEmailOriginal: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmailOriginal,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;
  const originalEmail = customerAuthorized.email;
  const originalStatus = customerAuthorized.status;
  const originalEmailVerified = customerAuthorized.email_verified;
  const originalCreatedAt = customerAuthorized.created_at;
  const originalUpdatedAt = customerAuthorized.updated_at;

  // Sanity checks on initial timestamps: created_at and updated_at should both exist
  TestValidator.equals(
    "created_at remains as initial created time",
    customerAuthorized.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "updated_at initially matches captured originalUpdatedAt",
    customerAuthorized.updated_at,
    originalUpdatedAt,
  );

  // 3. As customer, update profile via customer update endpoint
  // Generate a new unique email different from the original and admin email
  let newCustomerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  if (newCustomerEmail === originalEmail || newCustomerEmail === adminEmail) {
    newCustomerEmail = typia.random<string & tags.Format<"email">>();
  }

  // Choose a new status different from original to ensure visible change
  const statusCandidates = [
    "active",
    "suspended",
    "blocked",
    "pending",
  ] as const;
  let newStatus = RandomGenerator.pick(statusCandidates);
  if (newStatus === originalStatus) {
    newStatus = RandomGenerator.pick(statusCandidates);
  }

  // Flip email_verified flag to ensure it changes
  const newEmailVerified = !originalEmailVerified;

  const updateBody = {
    email: newCustomerEmail,
    status: newStatus,
    email_verified: newEmailVerified,
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      customerId,
      body: updateBody,
    });
  typia.assert(updatedCustomer);

  // Validate that updated fields match the update payload
  TestValidator.equals(
    "updated email matches requested new email",
    updatedCustomer.email,
    updateBody.email,
  );
  TestValidator.equals(
    "updated status matches requested new status",
    updatedCustomer.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated email_verified matches requested flag",
    updatedCustomer.email_verified,
    updateBody.email_verified,
  );

  // Validate timestamps: created_at unchanged; updated_at is more recent
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedCustomer.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at is later than original updated_at after profile update",
    new Date(updatedCustomer.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // 4. Switch actor context to admin via admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. As admin, fetch customer detail via admin endpoint
  const adminViewCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId,
    });
  typia.assert(adminViewCustomer);

  // Admin-view DTO must match the updated customer state
  TestValidator.equals(
    "admin view customer id matches updated customer id",
    adminViewCustomer.id,
    updatedCustomer.id,
  );
  TestValidator.equals(
    "admin view email matches updated email",
    adminViewCustomer.email,
    updatedCustomer.email,
  );
  TestValidator.equals(
    "admin view status matches updated status",
    adminViewCustomer.status,
    updatedCustomer.status,
  );
  TestValidator.equals(
    "admin view email_verified matches updated email_verified",
    adminViewCustomer.email_verified,
    updatedCustomer.email_verified,
  );
  TestValidator.equals(
    "admin view created_at matches updated created_at",
    adminViewCustomer.created_at,
    updatedCustomer.created_at,
  );
  TestValidator.equals(
    "admin view updated_at matches updated updated_at",
    adminViewCustomer.updated_at,
    updatedCustomer.updated_at,
  );
  TestValidator.equals(
    "admin view deleted_at matches updated deleted_at",
    adminViewCustomer.deleted_at,
    updatedCustomer.deleted_at,
  );
}
