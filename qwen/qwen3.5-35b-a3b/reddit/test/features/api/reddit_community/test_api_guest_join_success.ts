import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration with unique device fingerprint
  const guestDeviceId = typia.random<string & tags.Format<"uuid">>();
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_id: guestDeviceId,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      user_agent: typia.random<string>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify guest identity matches device fingerprint
  TestValidator.equals(
    "guest id matches device id",
    joinResult.id,
    guestDeviceId,
  );
  // 3. Verify token structure and expiration timestamps
  const token = joinResult.token;
  typia.assert(token);
  // Verify access token is a non-empty string
  TestValidator.predicate(
    "access token is non-empty string",
    () => typeof token.access === "string" && token.access.length > 0,
  );
  // Verify refresh token is a non-empty string
  TestValidator.predicate(
    "refresh token is non-empty string",
    () => typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // Verify expired_at is in the future (ISO 8601 format with tags)
  const expiredAt = new Date(token.expired_at);
  TestValidator.predicate(
    "expired_at is in the future",
    () => expiredAt > new Date(),
  );
  // Verify refreshable_until is after expired_at
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () => refreshableUntil > expiredAt,
  );
}
