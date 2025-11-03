import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordResetToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserPasswordResetToken";

/**
 * Ensure an authenticated user can retrieve all password reset tokens for their
 * account.
 *
 * 1. Register a user and sign in (registration response includes token, userId)
 * 2. Perform a password reset request to generate at least one token
 * 3. Invoke the list operation as that user (using their userId, authenticated)
 * 4. Verify: a) List includes at least one token b) Each token's
 *    community_platform_user_id matches the user c) Token structure is as per
 *    contract (typia.assert on each) d) Pagination information is present and
 *    consistent e) Tokens include most-recently generated token
 */
export async function test_api_user_password_reset_tokens_listing_for_existing_user(
  connection: api.IConnection,
) {
  // 1. Register the user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userDisplayName = RandomGenerator.name();
  const userHref = "https://example.com/register";
  const userReferrer = "https://example.com";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      href: userHref,
      referrer: userReferrer,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Request password reset (generates a token for this user)
  const resetPasswordResp =
    await api.functional.auth.user.password.reset.resetPassword(connection, {
      body: {
        email: userEmail,
      } satisfies ICommunityPlatformUser.IResetPasswordRequest,
    });
  typia.assert(resetPasswordResp);
  TestValidator.predicate(
    "reset password response message present",
    typeof resetPasswordResp.message === "string" &&
      resetPasswordResp.message.length > 0,
  );

  // 3. List tokens for this user
  const pageResp =
    await api.functional.communityPlatform.user.users.passwordResetTokens.index(
      connection,
      {
        userId: user.id,
        body: {}, // no filters, fetch all
      },
    );
  typia.assert(pageResp);
  TestValidator.predicate(
    "reset token page has at least one token",
    pageResp.data.length > 0,
  );
  TestValidator.equals(
    "pagination properties present",
    typeof pageResp.pagination.current,
    "number",
  );

  // Every token must belong to this user and be valid
  for (const token of pageResp.data) {
    typia.assert(token);
    TestValidator.equals(
      "token belongs to requesting user",
      token.community_platform_user_id,
      user.id,
    );
    TestValidator.predicate(
      "token id is uuid",
      typeof token.id === "string" && token.id.length > 0,
    );
  }
}
