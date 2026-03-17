import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();
  // 2. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 3. Login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate response
  TestValidator.equals("admin email matches", loginResult.email, joinEmail);
  TestValidator.equals("admin status active", loginResult.status, "active");
  // Validate JWT access token is a non-empty string
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  // Validate JWT refresh token is a non-empty string
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  // Validate expired_at is a valid date-time string
  const expiredDate = new Date(loginResult.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredDate.getTime()),
  );
  // Validate refreshable_until is a valid date-time string
  const refreshableDate = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableDate.getTime()),
  );
}
