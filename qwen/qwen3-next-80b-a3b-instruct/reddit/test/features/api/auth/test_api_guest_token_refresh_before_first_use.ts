import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_token_refresh_before_first_use(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest user to obtain a refresh token
  const guestRegister: IGuest.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const guestAuthorized: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestRegister,
    });
  typia.assert(guestAuthorized);

  // Step 2: Attempt to refresh token without first using the access token (this should fail)
  // According to scenario, refresh request must be rejected because the guest must first use the access token
  // The refresh endpoint expects IGuest.IRequest which is just the refresh token string
  await TestValidator.error(
    "refresh token before first use should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: guestAuthorized.token.refresh,
      });
    },
  );
}
