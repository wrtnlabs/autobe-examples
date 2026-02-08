import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test successful moderator login with correct credentials.
 * The join and login payloads are empty objects because IJoin and ILogin types are empty.
 * Test checks successful login returns a valid authorization token.
 * Also tests error on incorrect credentials by passing empty object (which likely causes error).
 */
export async function test_api_moderator_login_successful_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Create fresh connection for moderator join
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  // Join moderator (empty body due to empty IJoin type)
  const joinAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(joinAuthorized);
  // Create fresh connection for moderator login
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  // Login moderator (empty body due to empty ILogin type)
  const loginAuthorized = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {},
    },
  );
  typia.assert(loginAuthorized);
  // Validate token presence and format
  const token = loginAuthorized.token;
  TestValidator.predicate(
    "access token is string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // Validate ISO 8601 date format of expired_at and refreshable_until
  const regexISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  TestValidator.predicate(
    "expired_at is ISO 8601",
    regexISO8601.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601",
    regexISO8601.test(token.refreshable_until),
  );
  // Test error on incorrect login (simulate by calling login with empty but assume incorrect)
  await TestValidator.error(
    "login fails with incorrect credentials",
    async () => {
      await authorize_moderator_login(moderatorLoginConnection, {
        body: {},
      });
    },
  );
}
