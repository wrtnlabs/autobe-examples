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
  // 1. Generate consistent credentials for both join and login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 2. Create admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedAdmin = await authorize_admin_join(joinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(joinedAdmin);
  // 3. Login with created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // 4. Validate admin account information matches
  TestValidator.equals(
    "admin email matches between join and login",
    loginResponse.email,
    joinedAdmin.email,
  );
  TestValidator.equals(
    "admin id matches between join and login",
    loginResponse.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "isBanned is false for active account",
    loginResponse.isBanned,
    false,
  );
  TestValidator.equals(
    "banReason is null for active account",
    loginResponse.banReason,
    null,
  );
  TestValidator.predicate(
    "created_at is present",
    loginResponse.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    loginResponse.updatedAt !== undefined,
  );
  // 5. Validate authorization token structure
  const token = loginResponse.token;
  TestValidator.predicate(
    "access token is non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is present",
    token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    token.refreshable_until !== undefined,
  );
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    token.expired_at < token.refreshable_until,
  );
}