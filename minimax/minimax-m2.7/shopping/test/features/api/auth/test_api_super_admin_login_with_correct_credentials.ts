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

export async function test_api_super_admin_login_with_correct_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for super admin registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  // 1. Register a new super administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 2. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 3. Validate the authorization response
  typia.assert(authorized);
  // 4. Verify the response contains required fields
  TestValidator.equals("email matches registration", authorized.email, email);
  TestValidator.predicate("has valid id", authorized.id.length > 0);
  TestValidator.predicate(
    "has valid created_at",
    new Date(authorized.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "has valid updated_at",
    new Date(authorized.updated_at).getTime() > 0,
  );
  // 5. Validate JWT token structure
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
  // 6. Verify token expiration timestamps are in the future
  const now = Date.now();
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate("access token not expired", expiredAt > now);
  TestValidator.predicate(
    "refreshable until is in future",
    refreshableUntil > now,
  );
}
