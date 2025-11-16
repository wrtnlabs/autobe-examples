import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account to establish authentication context
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = RandomGenerator.alphaNumeric(12);
  const guestHref = typia.random<string & tags.Format<"uri">>();
  const guestReferrer = typia.random<string & tags.Format<"uri">>();

  const guest: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        password: guestPassword,
        href: guestHref,
        referrer: guestReferrer,
      } satisfies IGuest.ICreate,
    });
  typia.assert(guest);

  // Step 2: Attempt token refresh with invalid token
  // Use a malformed refresh token - not the one received from join but something invalid
  const invalidToken = "invalid-refresh-token-12345"; // Clearly invalid format

  await TestValidator.error(
    "server should reject invalid refresh token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: invalidToken,
      });
    },
  );
}
