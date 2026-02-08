import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario covers the primary success path of the administrator token refresh operation.
  // It ensures that a newly registered administrator can obtain new access and refresh tokens successfully by providing a valid refresh token.
  // 1. Administrator registration for initial authentication and obtaining refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Prepare refresh token from join response
  const refreshToken = authorized.token.refresh;
  // 3. Create new connection with refresh token in Authorization header
  const adminConnectionRefresh: api.IConnection = {
    host: connection.host,
    headers: { Authorization: refreshToken },
  };
  // 4. Invoke refresh token API using utility function with empty body
  const refreshed = await authorize_administrator_refresh(
    adminConnectionRefresh,
    {
      body: {},
    },
  );
  typia.assert(refreshed);
  // 5. Validate token presence and structure
  TestValidator.predicate(
    "access token exists",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  // 6. Validate expiration timestamps format and order
  const accessExpiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid ISO 8601 date",
    !isNaN(accessExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil.getTime() > accessExpiredAt.getTime(),
  );
}
