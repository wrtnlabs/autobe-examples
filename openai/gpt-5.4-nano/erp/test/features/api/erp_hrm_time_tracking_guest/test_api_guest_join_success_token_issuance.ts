import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success_token_issuance(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      email,
      password,
    } satisfies IErpHrmTimeTrackingGuest.IJoin,
  });
  typia.assert(joinResult);
  TestValidator.predicate("guest id not empty", joinResult.id.length > 0);
  TestValidator.predicate(
    "access token is non-empty",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    joinResult.token.refresh.length > 0,
  );
  const expiredAt = Date.parse(joinResult.token.expired_at);
  const refreshableUntil = Date.parse(joinResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntil >= expiredAt,
  );
  const responseJson = JSON.stringify(joinResult);
  TestValidator.predicate(
    "does not leak password",
    !responseJson.includes(password),
  );
  // Ensure no sensitive credential fields exist in response
  TestValidator.predicate(
    "response has no password field",
    !("password" in (joinResult as unknown as Record<string, unknown>)),
  );
  TestValidator.predicate(
    "response has no password_hash field",
    !("password_hash" in (joinResult as unknown as Record<string, unknown>)),
  );
  const accessToken = joinResult.token.access;
  const refreshToken = joinResult.token.refresh;
  void accessToken;
  void refreshToken;
}
