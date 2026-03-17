import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Extract initial token data    const initialGuestId: string = joinResponse.id;    const initialAccessToken: string = joinResponse.token.access;    const initialRefreshToken: string = joinResponse.token.refresh;    const initialExpiredAt: string = joinResponse.token.expired_at;    const initialRefreshableUntil: string = joinResponse.token.refreshable_until;
  // Phase 2: Refresh token with the old refresh token    const refreshConnection: api.IConnection = { host: connection.host };    const refreshResponse = await authorize_guest_refresh(refreshConnection, {      body: {        refresh_token: initialRefreshToken,      } satisfies IEcommerceMallGuest.IRefresh,    });    typia.assert(refreshResponse);
  // Phase 3: Validation    // 3.1 Guest ID must remain unchanged    TestValidator.equals(      "guest ID unchanged after refresh",      refreshResponse.id,      initialGuestId,    );
  // 3.2 Access token must be different (rotated)    TestValidator.notEquals(      "access token rotated after refresh",      refreshResponse.token.access,      initialAccessToken,    );
  // 3.3 Refresh token must be different (rotated)    TestValidator.notEquals(      "refresh token rotated after refresh",      refreshResponse.token.refresh,      initialRefreshToken,    );
  // 3.4 expired_at must be updated (new timestamp)    TestValidator.notEquals(      "access token expired_at updated",      refreshResponse.token.expired_at,      initialExpiredAt,    );
  // 3.5 refreshable_until must be updated    TestValidator.notEquals(      "refresh token refreshable_until updated",      refreshResponse.token.refreshable_until,      initialRefreshableUntil,    );
  // 3.6 Verify expiration timestamps are valid ISO 8601 format    typia.assert<string & tags.Format<"date-time">>(      refreshResponse.token.expired_at,    );    typia.assert<string & tags.Format<"date-time">>(      refreshResponse.token.refreshable_until,    );
  // 3.7 Verify refreshable_until is after expired_at (refresh window exists)    const expiredAt = new Date(refreshResponse.token.expired_at);    const refreshableUntil = new Date(refreshResponse.token.refreshable_until);    TestValidator.predicate(      "refreshable_until is after expired_at",      refreshableUntil.getTime() > expiredAt.getTime(),    );
  // 3.8 Verify new access token was set in connection headers after refresh    typia.assert<string>(refreshConnection.headers?.Authorization ?? "");    TestValidator.predicate(      "connection Authorization header contains Bearer token",      (refreshConnection.headers?.Authorization ?? "").startsWith("Bearer "),    );
  // 3.9 Verify connection header has the new token    const expectedBearer = `Bearer ${refreshResponse.token.access}`;    TestValidator.equals(      "connection Authorization header matches new token",      refreshConnection.headers?.Authorization,      expectedBearer,    );  }
} // Phase 1: Guest registration to create initial session    const joinConnection: api.IConnection = { host: connection.host };    const joinResponse = await authorize_guest_join(joinConnection, {      body: {        email: typia.random<string & tags.Format<"email">>(),        password: RandomGenerator.alphaNumeric(16),        href: typia.random<string & tags.Format<"uri">>(),        referrer: typia.random<string & tags.Format<"uri">>(),        ip: typia.random<string & tags.Format<"ipv4">>(),        user_agent: null,      } satisfies IEcommerceMallGuest.IJoin,    });    typia.assert(joinResponse);
