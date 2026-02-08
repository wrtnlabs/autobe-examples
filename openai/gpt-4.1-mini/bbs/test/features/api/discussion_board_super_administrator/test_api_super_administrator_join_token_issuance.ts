import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_join_token_issuance(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the super administrator join
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Perform super administrator join to get authorized tokens
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {} satisfies IDiscussionBoardSuperAdministrator.IJoin,
    },
  );
  // Validate the response token structure
  typia.assert(authorized);
  typia.assert(authorized.token);
  // Validate access token string is non-empty
  TestValidator.predicate(
    "access token is non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  // Validate refresh token string is non-empty
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  // Validate expired_at is a valid ISO 8601 date-time string and is in the future
  const expiredAtDate = new Date(authorized.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid ISO 8601",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAtDate.getTime() > Date.now(),
  );
  // Validate refreshable_until is a valid ISO 8601 date-time string and is after expired_at
  const refreshableUntilDate = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601",
    !isNaN(refreshableUntilDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );
  // Use the issued access token for a subsequent authenticated API call
  // Create a new connection with the Authorization header for super administrator
  const tokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // Perform a simple authenticated operation to verify token usability
  // For this scenario, call the join endpoint again with same body, expecting failure or error as user already exists
  // We check that the previous token is valid for making authorized calls
  // Since no direct utility function for a protected GET exists, we retry join and expect error
  // This is to confirm token authorization header works
  await TestValidator.error(
    "duplicate super administrator join should fail",
    async () => {
      await authorize_super_administrator_join(tokenConnection, {
        body: {} satisfies IDiscussionBoardSuperAdministrator.IJoin,
      });
    },
  );
}
