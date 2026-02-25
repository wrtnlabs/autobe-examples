import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
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
  // 1. Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(guestConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: null,
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(initialSession);
  // 2. Prepare for refresh with the current session_token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      session_token: initialSession.session_token,
    } satisfies IRedditCloneGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 3. Verify refresh results
  // New session_token should be different from initial
  TestValidator.notEquals(
    "new session token",
    refreshResponse.session_token,
    initialSession.session_token,
  );
  // Same device_id should be preserved
  TestValidator.equals(
    "device_id preserved",
    refreshResponse.device_id,
    initialSession.device_id,
  );
  // Expiration should be extended (new expired_at should be after initial)
  TestValidator.predicate(
    "expiration extended",
    () =>
      new Date(refreshResponse.expired_at).getTime() >
      new Date(initialSession.expired_at).getTime(),
  );
  // Authorization token should be present and valid
  TestValidator.predicate("authorization token valid", () => {
    typia.assert<IAuthorizationToken>(refreshResponse.token);
    return (
      refreshResponse.token.access.length > 0 &&
      refreshResponse.token.refresh.length > 0 &&
      refreshResponse.token.expired_at.length > 0 &&
      refreshResponse.token.refreshable_until.length > 0
    );
  });
}
