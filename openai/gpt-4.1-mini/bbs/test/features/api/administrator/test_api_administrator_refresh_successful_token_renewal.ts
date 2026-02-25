import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(joined);
  // 2. Refresh token using the refresh token obtained from join
  const refreshPayload: IDiscussionBoardAdministrator.IRefresh = {
    refreshToken: joined.token.refresh,
  };
  const refreshed = await authorize_administrator_refresh(adminConnection, {
    body: refreshPayload,
  });
  typia.assert(refreshed);
  // 3. Validate new tokens have fresh expiration dates
  {
    const oldExpiredAt = new Date(joined.token.expired_at).getTime();
    const newExpiredAt = new Date(refreshed.token.expired_at).getTime();
    const oldRefreshableUntil = new Date(
      joined.token.refreshable_until,
    ).getTime();
    const newRefreshableUntil = new Date(
      refreshed.token.refreshable_until,
    ).getTime();
    TestValidator.predicate(
      "access token expiration is extended",
      newExpiredAt > oldExpiredAt,
    );
    TestValidator.predicate(
      "refresh token expiration is extended",
      newRefreshableUntil > oldRefreshableUntil,
    );
  }
  // 4. Confirm administrator id, email, and grade are the same
  TestValidator.equals("administrator id unchanged", refreshed.id, joined.id);
  TestValidator.equals(
    "administrator email unchanged",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "administrator grade info equals",
    refreshed.grade,
    joined.grade,
  );
}
