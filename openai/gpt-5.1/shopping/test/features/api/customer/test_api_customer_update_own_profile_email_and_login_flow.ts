import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

export async function test_api_customer_update_own_profile_email_and_login_flow(
  connection: api.IConnection,
) {
  // 1. Customer joins with an initial email and password, establishing auth context
  const initialJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const initialAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: initialJoinBody,
    });
  typia.assert(initialAuth);

  // 2. Update the customer email via PUT /shoppingMall/customer/customers/{customerId}
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const updateBody = {
    email: newEmail,
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      customerId: initialAuth.id,
      body: updateBody,
    });
  typia.assert(updatedCustomer);

  // Business validations on update result
  TestValidator.equals(
    "customer id should remain the same after email update",
    updatedCustomer.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "email should be updated to newEmail",
    updatedCustomer.email,
    newEmail,
  );

  // 3. Attempt login with the old email (should fail)
  const oldEmailLoginBody = {
    email: initialJoinBody.email,
    password: initialJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  await TestValidator.error(
    "login with old email should fail after email change",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: oldEmailLoginBody,
      });
    },
  );

  // 4. Attempt login with the new email (should succeed)
  const newEmailLoginBody = {
    email: newEmail,
    password: initialJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const reAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: newEmailLoginBody,
    });
  typia.assert(reAuth);

  // Validate that the authenticated payload reflects new email and same id
  TestValidator.equals(
    "reauth id should match original customer id",
    reAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "reauth email should be the updated email",
    reAuth.email,
    newEmail,
  );

  // Validate last_login_at is set (non-null) after successful login
  await TestValidator.predicate(
    "last_login_at should be non-null after successful login",
    async () =>
      reAuth.last_login_at !== null && reAuth.last_login_at !== undefined,
  );
}
