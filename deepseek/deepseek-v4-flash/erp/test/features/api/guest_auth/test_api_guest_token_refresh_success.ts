import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest member account to obtain initial token pair
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResponse);
  const refreshToken = joinResponse.token.refresh;
  const memberId = joinResponse.id;
  const createdAt = joinResponse.created_at;
  const updatedAt = joinResponse.updated_at;
  // 2. Exchange the refresh token for new credentials
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IHrmTimeTrackingGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 3. Validate token rotation — access tokens must differ
  TestValidator.notEquals(
    "access token rotated",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  // 4. Validate identity continuity — member identity preserved across refresh
  TestValidator.equals("member id preserved", refreshResponse.id, memberId);
  TestValidator.equals(
    "created_at preserved",
    refreshResponse.created_at,
    createdAt,
  );
  TestValidator.equals(
    "updated_at preserved",
    refreshResponse.updated_at,
    updatedAt,
  );
  TestValidator.predicate(
    "deleted_at is null",
    refreshResponse.deleted_at === null,
  );
  // 5. Validate token expiry timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    refreshResponse.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshResponse.token.refreshable_until > now,
  );
}
