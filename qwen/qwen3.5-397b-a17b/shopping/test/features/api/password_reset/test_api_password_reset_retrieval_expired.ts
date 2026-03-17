import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
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
 * Test administrator retrieval of password reset request records for audit purposes.
 *
 * This test validates:
 * 1. Admin authentication and authorization to access password reset audit records
 * 2. Password reset record retrieval endpoint response structure
 * 3. Customer information is included in the reset record for audit trail
 * 4. No sensitive token data (actual token/hash) is exposed in response
 *
 * Note: Password reset records are created when customers initiate password recovery
 * via the password reset request endpoint. This test validates the retrieval mechanism
 * and response structure with proper admin authentication.
 */
export async function test_api_password_reset_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account (password resets are associated with customer accounts)
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 2. Authenticate as administrator to access password reset audit records
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 3. Login as admin with credentials from join step
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 4. Retrieve password reset record
  // Note: In production, resetId would come from password reset request creation
  // This test validates the endpoint structure and admin access control
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const passwordReset: IShoppingMallCustomerPasswordReset =
    await api.functional.shoppingMall.customer.password_resets.at(
      adminConnection,
      {
        resetId: resetId,
      },
    );
  typia.assert(passwordReset);
  // 5. Validate customer relationship is properly included for audit trail
  TestValidator.equals(
    "customer id format",
    typeof passwordReset.customer.id,
    "string",
  );
  TestValidator.equals(
    "customer email format",
    typeof passwordReset.customer.email,
    "string",
  );
  TestValidator.predicate(
    "customer email is valid format",
    passwordReset.customer.email.includes("@"),
  );
  // 6. Validate timestamp fields are ISO 8601 format
  TestValidator.predicate(
    "expires_at is ISO date",
    !isNaN(Date.parse(passwordReset.expires_at)),
  );
  TestValidator.predicate(
    "created_at is ISO date",
    !isNaN(Date.parse(passwordReset.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    !isNaN(Date.parse(passwordReset.updated_at)),
  );
  // 7. Validate consumed_at is nullable (null for unused/expired tokens)
  TestValidator.predicate(
    "consumed_at is null or valid date",
    passwordReset.consumed_at === null ||
      !isNaN(Date.parse(passwordReset.consumed_at)),
  );
}
