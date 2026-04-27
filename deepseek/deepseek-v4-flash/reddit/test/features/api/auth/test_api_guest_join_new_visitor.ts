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

export async function test_api_guest_join_new_visitor(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Join the platform as a new guest visitor with specific session context
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: "new-device-abc-123",
      href: "https://example.com/popular",
      referrer: "https://google.com",
    },
  });
  // 2. Validate the complete authorization response structure
  typia.assert(authorized);
  // 3. Verify guest id is a valid UUID v4
  TestValidator.predicate(
    "guest id is UUID v4",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // 4. Verify token expiration timeline
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expires within 30 minutes (short-lived JWT)",
    () => {
      const diffMinutes = (expiredAt.getTime() - now.getTime()) / (1000 * 60);
      return diffMinutes > 0 && diffMinutes <= 30;
    },
  );
  TestValidator.predicate(
    "refreshable_until is approximately 24 hours from now",
    () => {
      const diffHours =
        (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 48;
    },
  );
  // 5. Use the access token to browse public content (popular feed)
  const popularResponse = await fetch(
    `${connection.host}/communityPlatform/posts/feeds/popular`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authorized.token.access}`,
        "Content-Type": "application/json",
      },
    },
  );
  TestValidator.equals(
    "popular feed returns 200 OK",
    popularResponse.status,
    200,
  );
  const popularData = await popularResponse.json();
  TestValidator.predicate(
    "popular feed returns valid response data",
    popularData !== null && popularData !== undefined,
  );
}
