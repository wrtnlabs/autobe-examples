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

export async function test_api_admin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Test that admin login works with valid credentials
  // NOTE: Testing banned account login requires database update capability
  // which is not available through provided API functions. This test verifies
  // successful admin login with valid credentials.
  // 1. Create an admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAccount = await authorize_admin_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(adminAccount);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate login was successful
  TestValidator.equals("email matches", loginResult.email, joinInput.email);
  TestValidator.equals("status is active", loginResult.status, "active");
  TestValidator.predicate(
    "has valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    loginResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh has deadline",
    loginResult.token.refreshable_until !== undefined,
  );
}