import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator account registration.
 *
 * This test verifies the complete administrator join workflow:
 * 1. Generate unique administrator credentials (email, password)
 * 2. Submit registration request with session context (href, referrer, ip)
 * 3. Verify response contains administrator identity and JWT tokens
 * 4. Validate all response fields are properly populated
 * 5. Confirm access token is present for subsequent authenticated operations
 */
export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique administrator credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create administrator registration request
  const joinInput = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IShoppingMallAdministrator.IJoin;
  // Execute administrator join using utility function
  const authorized = await authorize_administrator_join(connection, {
    body: joinInput,
  });
  // Validate response structure and types
  typia.assert(authorized);
  // Verify administrator identity matches input
  TestValidator.equals("email matches input", authorized.email, email);
  // Verify account state for new administrator
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deletedAt,
    null,
  );
  // Verify token lifecycle: refreshable_until must be >= expired_at
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after or equal to expired_at",
    refreshableUntil >= expiredAt,
  );
}
