import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validate guest refresh rejects invalid/expired refresh tokens while
 * preserving the original guest record and allowing valid tokens to be
 * refreshed.
 *
 * Workflow:
 *
 * 1. Create a temporary guest via POST /auth/guest/join to obtain initial tokens.
 * 2. Mutate the issued refresh token to simulate an invalid/expired token.
 * 3. Attempt POST /auth/guest/refresh with the mutated token and expect an error.
 * 4. Retry POST /auth/guest/refresh with the original valid refresh token and
 *    expect success. Verify the guest id remains unchanged and the guest record
 *    remains active (deletedAt is null or undefined).
 */
export async function test_api_guest_refresh_invalid_token(
  connection: api.IConnection,
) {
  // 1) Create a guest to obtain initial tokens
  const createBody = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardGuest.ICreate;

  const authorized: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Store the original valid refresh token
  const originalRefreshToken: string = authorized.token.refresh;

  // 2) Mutate the refresh token to simulate invalid/expired token
  const invalidRefreshToken: string = originalRefreshToken + "-invalid";

  // 3) Attempt refresh with invalid token and expect an error (business-level rejection)
  await TestValidator.error(
    "refresh with mutated/invalid refresh token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // 4) Retry refresh with the original valid refresh token and expect success
  const renewed: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(renewed);

  // Business validations
  TestValidator.equals(
    "guest id unchanged after invalid refresh attempt",
    renewed.id,
    authorized.id,
  );
  TestValidator.predicate(
    "guest record remains active (deletedAt null or undefined)",
    renewed.deletedAt === null || renewed.deletedAt === undefined,
  );
}
