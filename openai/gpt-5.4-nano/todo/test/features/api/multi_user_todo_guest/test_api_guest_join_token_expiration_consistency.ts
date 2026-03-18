import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_token_expiration_consistency(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const deviceFingerprint = `${RandomGenerator.alphabets(32)}-${RandomGenerator.alphabets(12)}`;
  const guestConnection: api.IConnection = { host: connection.host };
  const startedAt = new Date();
  const output = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(output);
  const token = output.token;
  typia.assert(token);
  TestValidator.predicate("access token is non-empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );
  const expiredAtMs = new Date(token.expired_at).getTime();
  const refreshableUntilMs = new Date(token.refreshable_until).getTime();
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAtMs > startedAt.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until later than expired_at",
    refreshableUntilMs > expiredAtMs,
  );
}
