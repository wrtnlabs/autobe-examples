import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid super admin credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16) as string & tags.Format<"password">;
  // 2. Create a new super admin account via join
  const joinBody: IEcommerceMallSuperAdmin.IJoin = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  const joined: IEcommerceMallSuperAdmin.IAuthorized =
    await api.functional.ecommerceMall.auth.superAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);
  // 3. Log in with the created credentials
  const loginBody: IEcommerceMallSuperAdmin.ILogin = {
    email,
    password,
  } satisfies IEcommerceMallSuperAdmin.ILogin;
  const loggedIn: IEcommerceMallSuperAdmin.IAuthorized =
    await api.functional.ecommerceMall.auth.superAdmin.login(connection, {
      body: loginBody,
    });
  // 4. Validate complete response using typia.assert
  typia.assert(loggedIn);
  // 5. Validate super admin identity information
  TestValidator.equals("email matches input", loggedIn.email, email);
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loggedIn.id,
    ),
  );
  TestValidator.predicate(
    "has valid createdAt",
    !isNaN(Date.parse(loggedIn.createdAt)),
  );
  TestValidator.predicate(
    "has valid updatedAt",
    !isNaN(Date.parse(loggedIn.updatedAt)),
  );
  TestValidator.equals("deletedAt is null", loggedIn.deletedAt, null);
  // 6. Validate JWT tokens are present and non-empty
  TestValidator.predicate(
    "has non-empty access token",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "has non-empty refresh token",
    loggedIn.token.refresh.length > 0,
  );
  // 7. Validate token expiration timestamps are valid and in the future
  TestValidator.predicate(
    "has valid expired_at timestamp",
    !isNaN(Date.parse(loggedIn.token.expired_at)),
  );
  TestValidator.predicate(
    "has valid refreshable_until timestamp",
    !isNaN(Date.parse(loggedIn.token.refreshable_until)),
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(loggedIn.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(loggedIn.token.refreshable_until) > new Date(),
  );
}
