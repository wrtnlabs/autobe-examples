import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account to obtain a valid refresh token
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestJoinResponse: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        password: "ValidPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IGuest.ICreate,
    });
  typia.assert(guestJoinResponse);

  // Step 2: Extract the original refresh token from the join response
  const originalRefreshToken = guestJoinResponse.token.refresh;

  // Step 3: Create a random string to simulate an invalid/expired refresh token.
  // This simulates a token that has been tampered with, leaked, or expired.
  // The system should reject the use of any token that does not exist or is expired.
  const expiredRefreshToken = RandomGenerator.alphaNumeric(32);

  // Step 4: Attempt to refresh using the expired/invalide refresh token
  // The system should reject this request with an authentication error
  await TestValidator.error(
    "should reject refresh with invalid/expired refresh token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: expiredRefreshToken,
      });
    },
  );
}
