import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_expired_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that member refresh rejects an expired refresh token.
   *
   * Validates the end-to-end refresh behavior by:
   * 1. Registering (join) a new member and capturing the issued token pair.
   * 2. Advancing time until the refreshable_until deadline is in the past.
   * 3. Calling the refresh endpoint with the original refresh token.
   * 4. Expecting the backend to reject the request and not issue new valid tokens.
   *
   * This specifically checks enforcement of IMultiUserTodoUserProfile.IAuthorizationToken.refreshable_until.
   *
   * 1. Create member via join.
   * 2. Capture token.refresh and token.refreshable_until.
   * 3. Expire the token by advancing time beyond refreshable_until.
   * 4. Refresh must fail.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(joined);
  const refreshToken: string = joined.token.refresh;
  const refreshableUntil: string = joined.token.refreshable_until;
  // Advance time until refreshable_until is in the past.
  const refreshableUntilMs = new Date(refreshableUntil).getTime();
  const nowMs = Date.now();
  const advanceByMs = Math.max(0, refreshableUntilMs - nowMs + 1000);
  if (advanceByMs > 0) {
    await new Promise<void>((resolve) =>
      setTimeout(() => resolve(), advanceByMs),
    );
  }
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "expired refresh token rejected",
    401,
    async () => {
      await authorize_member_refresh(refreshConnection, {
        body: { refreshToken } satisfies IMultiUserTodoUserProfile.IRefresh,
      });
    },
  );
}
