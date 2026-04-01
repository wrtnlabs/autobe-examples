import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test super administrator registration with session context tracking.
 *
 * This test validates the super administrator join endpoint with complete
 * session context information for audit trail purposes. The test verifies:
 * 1. Registration succeeds with valid session context (href, referrer, ip)
 * 2. Authentication tokens are properly generated and returned
 * 3. Response structure contains all required account and token fields
 * 4. Session context fields are accepted (stored server-side for audit)
 *
 * Note: Session context fields (href, referrer, ip) are stored in the
 * shopping_mall_super_administrator_sessions table for security monitoring
 * and compliance auditing. They are not returned in the response for security
 * reasons, but their successful submission is validated by registration success.
 */
export async function test_api_super_administrator_join_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super administrator registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Prepare registration data with complete session context
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  // Register super administrator with session context tracking
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    { body: joinData },
  );
  // Validate complete response structure with typia
  typia.assert(authorized);
  // Business logic validations
  TestValidator.equals("email matches", authorized.email, joinData.email);
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () =>
      new Date(authorized.token.refreshable_until).getTime() >
      new Date(authorized.token.expired_at).getTime(),
  );
}
