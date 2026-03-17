import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Execute join operation using utility function
  const result = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      href,
      referrer,
      ip,
    },
  });
  // Validate response structure
  typia.assert(result);
  // Validate member data
  TestValidator.equals("username matches", result.username, username);
  TestValidator.equals("displayName is null", result.displayName, null);
  TestValidator.equals("bio is null", result.bio, null);
  TestValidator.equals("karma is zero", result.karma, 0);
  TestValidator.equals("avatar is null", result.avatar, null);
  // Validate token structure
  TestValidator.predicate(
    "access token exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  // Validate timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  // Validate connection headers were updated with access token
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
}
