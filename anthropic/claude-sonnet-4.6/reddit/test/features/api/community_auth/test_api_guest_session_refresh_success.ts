import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
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
  // Step 1: Establish guest identity via join
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // Step 2: Refresh the guest session using the refresh token from join
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: joinResponse.token.refresh,
    } satisfies ICommunityGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // Validate: guest identity continuity — same id and fingerprint
  TestValidator.equals(
    "guest id unchanged after refresh",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "guest fingerprint unchanged after refresh",
    refreshResponse.fingerprint,
    joinResponse.fingerprint,
  );
  // Validate: new tokens are different from original tokens
  TestValidator.notEquals(
    "access token renewed",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token renewed",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  // Validate: token expiry fields are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "token.expired_at is in the future",
    refreshResponse.token.expired_at > now,
  );
  TestValidator.predicate(
    "token.refreshable_until is in the future",
    refreshResponse.token.refreshable_until > now,
  );
  // Validate: refreshable_until >= expired_at
  TestValidator.predicate(
    "token.refreshable_until >= token.expired_at",
    refreshResponse.token.refreshable_until >= refreshResponse.token.expired_at,
  );
  // Validate: guest record timestamps unchanged (not mutated by refresh)
  TestValidator.equals(
    "created_at unchanged",
    refreshResponse.created_at,
    joinResponse.created_at,
  );
  TestValidator.equals(
    "updated_at unchanged",
    refreshResponse.updated_at,
    joinResponse.updated_at,
  );
}
