import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection (never use base connection directly)
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Prepare join credentials with a unique email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  // Step 3: Call admin join using the mandatory utility function
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
    },
  });
  // Step 4: Type-validate the full response (validates UUID, email format, date-time formats, etc.)
  typia.assert(authorized);
  // Step 5: Business logic validations
  // Token fields: access and refresh must be non-empty strings
  TestValidator.predicate(
    "token.access is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    authorized.token.refresh.length > 0,
  );
  // Email in response must exactly match what was submitted
  TestValidator.equals(
    "email matches submitted value",
    authorized.email,
    email,
  );
  // actor_type must be 'customer' or 'seller'
  TestValidator.predicate(
    "actor_type is customer or seller",
    authorized.actor_type === "customer" || authorized.actor_type === "seller",
  );
  // grade must be 'regular' for newly activated admins
  TestValidator.equals("grade is regular", authorized.grade, "regular");
  // deleted_at must be null (account is active)
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Nested admin object must also have correct grade and deleted_at
  TestValidator.equals(
    "admin.grade is regular",
    authorized.admin.grade,
    "regular",
  );
  TestValidator.equals(
    "admin.deleted_at is null",
    authorized.admin.deleted_at,
    null,
  );
  TestValidator.equals(
    "admin.email matches submitted value",
    authorized.admin.email,
    email,
  );
  TestValidator.predicate(
    "admin.actor_type is customer or seller",
    authorized.admin.actor_type === "customer" ||
      authorized.admin.actor_type === "seller",
  );
  // Confirm plaintext password is NOT present in any stringified response field
  const responseString = JSON.stringify(authorized);
  TestValidator.predicate(
    "plaintext password not in response",
    !responseString.includes(password),
  );
}
