import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_token_refresh_empty_token(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account with valid credentials to obtain a refresh token
  const guest: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IGuest.ICreate,
    });
  typia.assert(guest);

  // Step 2: Attempt to refresh token with empty refresh token string (invalid)
  // This should trigger a validation error since empty string is not a valid refresh token
  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: "", // Empty refresh token string - invalid according to IGuest.IRequest type
      });
    },
  );
}
