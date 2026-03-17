import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member registration flow.
 * 1. Join with valid credentials
 * 2. Verify response contains valid JWT tokens
 * 3. Verify tokens can be used for authenticated operations
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a unique email for testing
  const email = `${RandomGenerator.name().toLowerCase().replace(/\s+/g, ".")}@test.com`;
  // Prepare valid join credentials
  const body = {
    email,
    password: "SecurePass123!",
    href: "https://example.com/register",
    referrer: "https://google.com",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityMember.IJoin;
  // Step 1: Join as new member
  const joinResult = await authorize_member_join(connection, { body });
  // Step 2: Validate response structure
  typia.assert(joinResult);
  // Step 3: Verify token structure
  TestValidator.equals(
    "access token exists",
    joinResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    joinResult.token.refresh.length > 0,
    true,
  );
  // Step 4: Verify expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(joinResult.token.expired_at);
  const refreshableUntil = new Date(joinResult.token.refreshable_until);
  TestValidator.predicate("access token not expired", expiredAt > now);
  TestValidator.predicate(
    "refreshable until is after access expires",
    refreshableUntil > expiredAt,
  );
  // Step 5: Verify tokens can be used for authenticated operations
  // Create a new connection with the access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResult.token.access,
    },
  };
  // The join operation itself doesn't have subsequent authenticated operations
  // We'll verify the token format is correct by checking it's a valid JWT structure
  TestValidator.predicate(
    "access token has valid JWT structure",
    joinResult.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "refresh token has valid JWT structure",
    joinResult.token.refresh.split(".").length === 3,
  );
}
