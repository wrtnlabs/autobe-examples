import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member with valid data
  const output = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(output);
  // Verify initial profile state
  TestValidator.equals("karma score initial", output.karmaScore, 0);
  TestValidator.equals("display name initial", output.displayName, "");
  TestValidator.equals("bio initial", output.bio, null);
  TestValidator.equals("avatar url initial", output.avatarUrl, null);
  TestValidator.equals(
    "moderator of communities initial",
    output.moderatorOfCommunities,
    [],
  );
  TestValidator.equals("banned users initial", output.bannedUsers, []);
  // Verify token exists and has correct structure
  typia.assert(output.token);
  TestValidator.notEquals("access token exists", output.token.access, "");
  TestValidator.notEquals("refresh token exists", output.token.refresh, "");
  TestValidator.notEquals("expired at exists", output.token.expired_at, "");
  TestValidator.notEquals(
    "refreshable until exists",
    output.token.refreshable_until,
    "",
  );
  // Verify expiration times are in the future
  const expiredAt = new Date(output.token.expired_at);
  const refreshableUntil = new Date(output.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("expired at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable until after expired at",
    refreshableUntil > expiredAt,
  );
  // Test immediate access with new connection using access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...memberConnection.headers,
      Authorization: `Bearer ${output.token.access}`,
    },
  };
  typia.assert(authenticatedConnection.headers?.Authorization);
}