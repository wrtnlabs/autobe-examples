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

export async function test_api_admin_join_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and register new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const result = await authorize_admin_join(adminConnection, { body });
  typia.assert(result);
  // 2. Validate admin account identity information
  TestValidator.equals("admin id is non-empty string", result.id.length > 0, true);
  TestValidator.equals("email matches input", result.email, body.email);
  TestValidator.equals("account is not banned", result.isBanned, false);
  TestValidator.equals("ban reason is null", result.banReason, null);
  // 3. Validate JWT tokens structure
  TestValidator.predicate(
    "access token is non-empty string",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    result.token.refresh.length > 0,
  );
  // 4. Validate token expiration timestamps exist and are valid
  TestValidator.predicate(
    "access token has expiration",
    result.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    result.token.refreshable_until !== undefined,
  );
  // 5. Validate access token expires before refreshable_until
  const expiredAt = new Date(result.token.expired_at).getTime();
  const refreshableUntil = new Date(result.token.refreshable_until).getTime();
  TestValidator.predicate(
    "access token expires before refresh deadline",
    expiredAt < refreshableUntil,
  );
}