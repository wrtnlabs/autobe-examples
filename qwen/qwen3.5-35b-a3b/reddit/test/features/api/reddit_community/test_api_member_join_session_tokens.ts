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

export async function test_api_member_join_session_tokens(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Step 2: Validate response structure
  typia.assert(authorization);
  const token = authorization.token;
  typia.assert(token);
  // Step 3: Validate token fields exist and have correct types
  TestValidator.equals("access token is string", typeof token.access, "string");
  TestValidator.equals(
    "refresh token is string",
    typeof token.refresh,
    "string",
  );
  TestValidator.equals(
    "access token is not empty",
    token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is not empty",
    token.refresh.length > 0,
    true,
  );
  // Step 4: Validate expiration timestamps exist and are valid date-time strings
  TestValidator.equals(
    "expired_at is string",
    typeof token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until is string",
    typeof token.refreshable_until,
    "string",
  );
  typia.assert(token.expired_at);
  typia.assert(token.refreshable_until);
  // Step 5: Validate expiration metadata - all timestamps must be in future
  const now = new Date();
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Step 6: Validate expiration intervals (approximate values based on spec)
  const expiredAfterSeconds = (expiredAt.getTime() - now.getTime()) / 1000;
  const refreshableAfterSeconds =
    (refreshableUntil.getTime() - now.getTime()) / 1000;
  TestValidator.predicate(
    "access token expires in approximately 15 minutes",
    expiredAfterSeconds >= 840 && expiredAfterSeconds <= 960,
  );
  TestValidator.predicate(
    "refreshable until approximately 7 days",
    refreshableAfterSeconds >= 518400 && refreshableAfterSeconds <= 691200,
  );
  // Step 7: Verify access token is recognized by creating authenticated connection
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: `Bearer ${token.access}`,
  };
  // Validate the token structure by attempting to decode (basic JWT check)
  const accessParts = token.access.split(".");
  const refreshParts = token.refresh.split(".");
  TestValidator.equals(
    "access token has JWT structure (3 parts)",
    accessParts.length,
    3,
  );
  TestValidator.equals(
    "refresh token has JWT structure (3 parts)",
    refreshParts.length,
    3,
  );
  TestValidator.predicate(
    "access token parts are non-empty",
    accessParts.every((part) => part.length > 0),
  );
  TestValidator.predicate(
    "refresh token parts are non-empty",
    refreshParts.every((part) => part.length > 0),
  );
}
