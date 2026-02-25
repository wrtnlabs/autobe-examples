import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member registration with valid credentials.
 *
 * This test verifies:
 * 1. Member can register with valid email, password, and username
 * 2. Response contains valid UUID id
 * 3. Username and email match input values
 * 4. Karma is initialized to 0
 * 5. Valid access and refresh tokens are returned
 * 6. Token expiration timestamps are correct (access ~30 min, refresh ~14 days)
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = RandomGenerator.alphaNumeric(12);
  const testPassword = `Password${RandomGenerator.alphaNumeric(6)}1!`;
  const testDisplayName = RandomGenerator.name();
  // Create member connection for join
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member with valid credentials
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      username: testUsername,
      display_name: testDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Validate response structure
  typia.assert(member);
  // Verify response contains correct member data
  TestValidator.equals("username matches", member.username, testUsername);
  TestValidator.equals("karma initialized to 0", member.karma, 0);
  TestValidator.equals(
    "display_name matches",
    member.display_name,
    testDisplayName,
  );
  // Verify token expiration timestamps are valid
  const now = new Date();
  const expiredAt = new Date(member.expiredAt);
  const refreshableUntil = new Date(member.token.refreshable_until);
  // Access token should expire in ~30 minutes (allow 5 minute buffer for network latency)
  const thirtyMinutes = 30 * 60 * 1000;
  const accessTimeDiff = expiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessTimeDiff > 0 &&
      accessTimeDiff > thirtyMinutes - 5 * 60 * 1000 &&
      accessTimeDiff <= thirtyMinutes + 5 * 60 * 1000,
  );
  // Refresh token should be valid for ~14 days (allow 1 day buffer)
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  const refreshTimeDiff = refreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token valid for approximately 14 days",
    refreshTimeDiff > fourteenDays - 24 * 60 * 60 * 1000 &&
      refreshTimeDiff <= fourteenDays + 24 * 60 * 60 * 1000,
  );
}
