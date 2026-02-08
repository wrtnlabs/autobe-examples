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

export async function test_api_guest_token_refresh_with_mismatched_session(
  connection: api.IConnection,
): Promise<void> {
  // Test refreshing the guest token with a mismatched session device fingerprint or anonymous ID
  // 1. Create a guest session by joining
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestJoinConnection, {
    body: {},
  });
  typia.assert(initialAuth);
  // 2. Create a new connection simulating a different device or session
  const mismatchedConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to refresh token with empty body
  // Expect error due to device fingerprint or anonymous ID mismatch
  await TestValidator.error(
    "guest token refresh with mismatched session",
    async () => {
      await authorize_guest_refresh(mismatchedConnection, {
        body: {},
      });
    },
  );
}
