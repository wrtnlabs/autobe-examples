import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_authorized_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    href: "https://example.com/community/guest-entry",
    referrer: "https://example.com/community/landing",
    ip: "203.0.113.10",
  } satisfies ICommunityPlatformGuest.IJoin;
  const joined: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(joinConnection, {
      body: joinBody,
    });
  typia.assert(joined);
  TestValidator.equals(
    "joined guest starts as active",
    joined.deleted_at,
    null,
  );
  TestValidator.predicate(
    "joined access token is non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined refresh token is non-empty",
    joined.token.refresh.length > 0,
  );
  const refreshConnection: api.IConnection = {
    host: connection.host,
    headers: { ...(joinConnection.headers ?? {}) },
  };
  const refreshBody = {
    refresh: true,
    href: "https://example.com/community/session-refresh",
    referrer: "https://example.com/community/guest-entry",
    ip: "203.0.113.11",
  } satisfies ICommunityPlatformGuest.IRefresh;
  const refreshed: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: refreshBody,
    });
  typia.assert(refreshed);
  TestValidator.equals(
    "guest id is preserved across refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "guest key is preserved across refresh",
    refreshed.guest_key,
    joined.guest_key,
  );
  TestValidator.equals(
    "guest remains active after refresh",
    refreshed.deleted_at,
    null,
  );
  TestValidator.predicate(
    "refreshed access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expired_at is non-empty",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable_until is non-empty",
    refreshed.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "refresh returns a fresh token bundle",
    refreshed.token.access !== joined.token.access ||
      refreshed.token.refresh !== joined.token.refresh,
  );
}
