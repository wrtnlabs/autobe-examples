import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserVerificationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserVerificationToken";

/**
 * Validate that a registered user can retrieve their issued verification
 * tokens.
 *
 * 1. Register a new user using the auth join endpoint with unique credentials and
 *    URLs.
 * 2. Extract the registered user's id from the join response.
 * 3. Attempt to fetch all verification tokens for that user via PATCH
 *    /communityPlatform/user/users/{userId}/verificationTokens.
 * 4. Validate type of response; confirm returned data is a paged list of
 *    verification tokens with correct user association.
 * 5. Validate that every token record "community_platform_user_id" matches the
 *    registered user's id.
 */
export async function test_api_user_verification_tokens_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);
  // 2. Fetch verification tokens for this user
  const tokens: IPageICommunityPlatformUserVerificationToken =
    await api.functional.communityPlatform.user.users.verificationTokens.index(
      connection,
      {
        userId: user.id,
        body: {},
      },
    );
  typia.assert(tokens);
  // 3. Verify every token belongs to the registered user
  for (const t of tokens.data) {
    TestValidator.equals(
      "token belongs to user",
      t.community_platform_user_id,
      user.id,
    );
  }
}
