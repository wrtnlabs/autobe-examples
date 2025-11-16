import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_token_refresh_missing_href(
  connection: api.IConnection,
) {
  // Step 1: Join as guest to obtain a valid refresh token
  const joinResponse: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/join",
        referrer: "https://example.com/landing",
      } satisfies IGuest.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Extract refresh token from the join response
  const refreshToken = joinResponse.token.refresh;

  // Step 3: Attempt to refresh token with missing href field (required)
  // This should fail with a validation error since href is mandatory in IGuest.IRequest
  await TestValidator.error(
    "refresh request should fail with missing mandatory href",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: refreshToken,
      });
    },
  );
}
