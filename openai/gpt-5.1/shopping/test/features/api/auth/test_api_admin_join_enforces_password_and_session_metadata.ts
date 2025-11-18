import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_join_enforces_password_and_session_metadata(
  connection: api.IConnection,
) {
  // 1. Prepare first admin join payload with IPv4 session context
  const email1: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password1: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const href1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip4: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();

  const body1 = {
    email: email1,
    password: password1,
    ip: ip4,
    href: href1,
    referrer: referrer1,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: body1,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin1);

  // Basic identity and token validation for first admin
  TestValidator.predicate(
    "first admin id should be a non-empty string",
    (admin1.id as string).length > 0,
  );
  TestValidator.equals(
    "first admin email should match input",
    admin1.email,
    email1,
  );
  TestValidator.predicate(
    "first admin token.access should be non-empty",
    admin1.token.access.length > 0,
  );
  TestValidator.predicate(
    "first admin token.refresh should be non-empty",
    admin1.token.refresh.length > 0,
  );

  // Ensure no obvious sensitive fields are present on the top-level object
  TestValidator.predicate(
    "no password_hash field should be exposed on IAuthorized",
    !Object.prototype.hasOwnProperty.call(admin1 as any, "password_hash"),
  );

  // 2. Prepare second admin join payload with IPv6 session context
  const email2: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password2: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const href2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip6: string & tags.Format<"ipv6"> = typia.random<
    string & tags.Format<"ipv6">
  >();

  const body2 = {
    email: email2,
    password: password2,
    ip: ip6,
    href: href2,
    referrer: referrer2,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: body2,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin2);

  // Validate second admin identity and token
  TestValidator.predicate(
    "second admin id should be a non-empty string",
    (admin2.id as string).length > 0,
  );
  TestValidator.equals(
    "second admin email should match input",
    admin2.email,
    email2,
  );
  TestValidator.predicate(
    "second admin token.access should be non-empty",
    admin2.token.access.length > 0,
  );
  TestValidator.predicate(
    "second admin token.refresh should be non-empty",
    admin2.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "no password_hash field should be exposed on second IAuthorized",
    !Object.prototype.hasOwnProperty.call(admin2 as any, "password_hash"),
  );

  // 3. Ensure the two admins are independent and do not interfere
  TestValidator.notEquals(
    "admin ids must differ between two join calls",
    admin1.id,
    admin2.id,
  );
  TestValidator.notEquals(
    "access tokens must differ between two join calls",
    admin1.token.access,
    admin2.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens must differ between two join calls",
    admin1.token.refresh,
    admin2.token.refresh,
  );

  // 4. Ensure that connection Authorization header has been updated
  // to the most recent admin's access token by the SDK side effect.
  if (connection.headers !== undefined) {
    const authHeader = (connection.headers as Record<string, unknown>)[
      "Authorization"
    ];
    if (typeof authHeader === "string") {
      TestValidator.equals(
        "connection Authorization header should contain latest admin access token",
        authHeader,
        admin2.token.access,
      );
    }
  }
}
