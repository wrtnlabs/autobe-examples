import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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
  // 1. Create admin account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: "admin@test.com",
      password: "ValidPass123!",
      displayName: "Admin Test User",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Login with the created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: "admin@test.com",
      password: "ValidPass123!",
      href: "http://localhost:3000/dashboard",
      referrer: "http://localhost:3000/login",
    },
  });
  typia.assert(loginResult);
  // 3. Verify response structure
  TestValidator.equals(
    "email matches registered",
    loginResult.email,
    "admin@test.com",
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResult.id,
    ),
  );
  TestValidator.predicate(
    "has displayName",
    loginResult.displayName.length > 0,
  );
  TestValidator.predicate("has token object", !!loginResult.token);
  // 4. Verify token structure
  const token = loginResult.token;
  TestValidator.predicate(
    "access token is JWT format",
    token.access.split(".").length === 3,
  );
  TestValidator.predicate("refresh token is present", token.refresh.length > 0);
  TestValidator.notEquals("tokens are different", token.access, token.refresh);
  // 5. Verify expiration timestamps are ISO 8601 format
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
  TestValidator.predicate(
    "expired_at is ISO 8601",
    iso8601Regex.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601",
    iso8601Regex.test(token.refreshable_until),
  );
}
