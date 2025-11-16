import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator via join API
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const joinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    email,
    name: RandomGenerator.name(),
    password,
    // ip is optional, exercise the nullable field by passing null explicitly
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(joinedAdmin);

  // Basic business validations on join response
  TestValidator.predicate(
    "joined admin should be active",
    joinedAdmin.isActive === true,
  );
  TestValidator.predicate(
    "joined admin status should be non-empty",
    joinedAdmin.status.length > 0,
  );
  TestValidator.predicate(
    "join access token should be non-empty",
    joinedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "join refresh token should be non-empty",
    joinedAdmin.token.refresh.length > 0,
  );

  // 2. Login with the same credentials
  const loginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const loginBody = {
    email,
    password,
    // exercise optional ip as concrete value on login
    ip: "203.0.113.10",
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loggedInAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(loggedInAdmin);

  // 3. Business validations: identity consistency and token presence
  TestValidator.equals(
    "login admin id should match joined admin id",
    loggedInAdmin.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "login admin email should match joined admin email",
    loggedInAdmin.email,
    joinedAdmin.email,
  );
  TestValidator.equals(
    "login displayName should match joined displayName",
    loggedInAdmin.displayName,
    joinedAdmin.displayName,
  );

  TestValidator.predicate(
    "logged-in admin should be active",
    loggedInAdmin.isActive === true,
  );
  TestValidator.predicate(
    "logged-in admin status should be non-empty",
    loggedInAdmin.status.length > 0,
  );

  // Token integrity: non-empty and looks like JWT (three segments) without deep parsing
  TestValidator.predicate(
    "login access token should be non-empty",
    loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token should be non-empty",
    loggedInAdmin.token.refresh.length > 0,
  );

  const accessSegments: string[] = loggedInAdmin.token.access.split(".");
  const refreshSegments: string[] = loggedInAdmin.token.refresh.split(".");

  TestValidator.predicate(
    "login access token should have at least two segments",
    accessSegments.length >= 2,
  );
  TestValidator.predicate(
    "login refresh token should have at least two segments",
    refreshSegments.length >= 2,
  );

  // Ensure createdAt/updatedAt are present (format already covered by typia)
  TestValidator.predicate(
    "login createdAt should be non-empty",
    loggedInAdmin.createdAt.length > 0,
  );
  TestValidator.predicate(
    "login updatedAt should be non-empty",
    loggedInAdmin.updatedAt.length > 0,
  );
}
