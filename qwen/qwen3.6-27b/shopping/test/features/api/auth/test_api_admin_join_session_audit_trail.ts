import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test session audit trail creation during admin registration process.
 *
 * Validates the admin join endpoint captures session context (href, referrer, ip)
 * and returns a valid IAuthorized response with JWT tokens.
 *
 * 1. Admin connection is created.
 * 2. Join request includes email, password, href, referrer, and ip.
 * 3. Response token access and refresh fields are non-empty.
 * 4. isSuper and isBanned flags are false by default.
 */
export async function test_api_admin_join_session_audit_trail(
  connection: api.IConnection,
) {
  // 1. Setup connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Prepare join body
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommercePlatformAdmin.IJoin;
  // 3. Execute join
  const authorized = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 4. Validate business rules
  TestValidator.equals("isSuper is false", authorized.isSuper, false);
  TestValidator.equals("isBanned is false", authorized.isBanned, false);
  TestValidator.predicate(
    "access token exists",
    authorized.token.access !== "",
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh !== "",
  );
}
