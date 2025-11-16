import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_token_refresh_missing_token(
  connection: api.IConnection,
) {
  // Step 1: Join as guest to establish an authenticated session
  const joinResponse: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IGuest.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Attempt to refresh token with empty refresh token string
  // IGuest.IRequest is a string type — the only required value is the token
  // Sending an empty string tests that the empty token is rejected
  await TestValidator.error(
    "refresh token must not be empty string",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: "" satisfies IGuest.IRequest,
      });
    },
  );
}
