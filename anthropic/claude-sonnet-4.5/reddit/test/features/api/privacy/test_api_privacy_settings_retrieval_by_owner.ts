import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test privacy settings retrieval by the member owner.
 *
 * This test validates that a member can successfully retrieve their own privacy
 * settings after registration. The workflow includes:
 *
 * 1. Register a new member account with valid credentials
 * 2. Retrieve privacy settings using the member's own userId
 * 3. Validate the privacy settings response structure and data
 *
 * This ensures that members can access and review their privacy preferences
 * through the API immediately after account creation.
 */
export async function test_api_privacy_settings_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "Aa1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(member);

  // Step 2: Retrieve privacy settings using the member's userId
  const privacySettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.at(connection, {
      userId: member.id,
    });
  typia.assert(privacySettings);
}
