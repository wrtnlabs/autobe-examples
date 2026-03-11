import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
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
  // Step 1: Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Prepare refresh token from initial session
  const refreshBody: IRedditLikeGuest.IRefresh = {
    refresh_token: joinResponse.token.refresh,
  };
  // Step 3: Refresh guest session
  const refreshResponse = await authorize_guest_refresh(guestConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResponse);
  // Step 4: Validate response structure
  TestValidator.equals("id matches", refreshResponse.id, joinResponse.id);
  TestValidator.equals(
    "device_id matches",
    refreshResponse.device_id,
    joinResponse.device_id,
  );
  TestValidator.predicate(
    "new tokens generated",
    refreshResponse.token.access !== joinResponse.token.access,
  );
  TestValidator.predicate(
    "new refresh token",
    refreshResponse.token.refresh !== joinResponse.token.refresh,
  );
  TestValidator.predicate(
    "new expired_at is later",
    new Date(refreshResponse.token.expired_at) >
      new Date(joinResponse.token.expired_at),
  );
  TestValidator.predicate(
    "new refreshable_until is later",
    new Date(refreshResponse.token.refreshable_until) >
      new Date(joinResponse.token.refreshable_until),
  );
  TestValidator.predicate(
    "created_at unchanged",
    refreshResponse.created_at === joinResponse.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    refreshResponse.updated_at !== joinResponse.updated_at,
  );
}
