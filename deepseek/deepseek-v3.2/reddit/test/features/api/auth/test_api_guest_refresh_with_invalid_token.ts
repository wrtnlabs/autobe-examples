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

export async function test_api_guest_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session to obtain valid refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      anonymous_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestSession);
  // Test 1: Malformed refresh token (random string)
  await TestValidator.error(
    "refresh with malformed token should return 401",
    async () => {
      await api.functional.communityPlatform.auth.guest.refresh(
        guestConnection,
        {
          body: {
            refresh: RandomGenerator.alphabets(50),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          } satisfies ICommunityPlatformGuest.IRefresh,
        },
      );
    },
  );
  // Test 2: Tampered refresh token (modify valid token)
  const validToken = guestSession.token.refresh;
  const tamperedToken =
    validToken.slice(0, validToken.length - 10) + RandomGenerator.alphabets(10);
  await TestValidator.error(
    "refresh with tampered token should return 401",
    async () => {
      await api.functional.communityPlatform.auth.guest.refresh(
        guestConnection,
        {
          body: {
            refresh: tamperedToken,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          } satisfies ICommunityPlatformGuest.IRefresh,
        },
      );
    },
  );
  // Test 3: Refresh token reuse (if single-use tokens)
  // First use valid token for refresh
  const refreshedSession =
    await api.functional.communityPlatform.auth.guest.refresh(guestConnection, {
      body: {
        refresh: guestSession.token.refresh,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformGuest.IRefresh,
    });
  typia.assert(refreshedSession);
  // Try to reuse the same refresh token
  await TestValidator.error(
    "refresh with reused token should return 401",
    async () => {
      await api.functional.communityPlatform.auth.guest.refresh(
        guestConnection,
        {
          body: {
            refresh: guestSession.token.refresh,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          } satisfies ICommunityPlatformGuest.IRefresh,
        },
      );
    },
  );
  // Test 4: Empty refresh token
  await TestValidator.error(
    "refresh with empty token should return 401",
    async () => {
      await api.functional.communityPlatform.auth.guest.refresh(
        guestConnection,
        {
          body: {
            refresh: "",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          } satisfies ICommunityPlatformGuest.IRefresh,
        },
      );
    },
  );
}
