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

export async function test_api_super_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful token refresh for a super administrator.
  //
  // Precondition: A super administrator has already joined and received valid JWT tokens.
  // Action: The super administrator submits a valid refresh token to the refresh endpoint.
  // Expected outcome: The system validates the refresh token and returns new access and refresh tokens with updated expiration timestamps.
  // Validation points: Confirm that the returned tokens are valid JWTs, expiration timestamps are in the future, and maintain the super administrator's authorization level.
  // 1. Create a new connection for the super administrator join.
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Call the utility function to join as super administrator.
  // Since IJoin is an empty object, we pass an empty object.
  const joined = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(joined);
  // 3. Update the superAdminConnection headers to include the access token.
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = joined.token.access;
  // 4. Submit the refresh operation with a valid refresh token.
  const refreshed = await authorize_super_administrator_refresh(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(refreshed);
  // 5. Validate that the refresh tokens are new and valid.
  // Access token and refresh token must be non-empty strings.
  TestValidator.predicate(
    "access token is non-empty",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  // 6. Validate expiration timestamps are in the future relative to now.
  const now = new Date();
  const expiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
  // 7. Validate that the refreshed tokens are different from the original tokens.
  TestValidator.notEquals(
    "access token changed",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    joined.token.refresh,
    refreshed.token.refresh,
  );
}
