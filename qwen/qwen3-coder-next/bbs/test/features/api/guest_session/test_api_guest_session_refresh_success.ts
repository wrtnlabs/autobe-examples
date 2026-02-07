import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest session first
  const guestConnection1: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection1, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(joined);
  // Create a new connection with the refreshed token
  const guestConnection2: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(guestConnection2, {
    body: typia.random<IDiscussionBoardGuest.IRefresh>(),
  });
  typia.assert(refreshed);
  // Verify the refreshed token is different from the original
  TestValidator.notEquals(
    "access tokens differ",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    joined.token.refresh,
    refreshed.token.refresh,
  );
}
