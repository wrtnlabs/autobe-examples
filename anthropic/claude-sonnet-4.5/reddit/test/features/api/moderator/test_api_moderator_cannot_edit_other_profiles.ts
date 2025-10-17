import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that moderators cannot edit other users' profiles despite elevated role.
 *
 * This test validates the critical security requirement that profile editing
 * must be restricted to the profile owner only. Even moderators with elevated
 * privileges should not be able to modify another user's profile information.
 *
 * Test workflow:
 *
 * 1. Create a member account through registration
 * 2. Create a moderator account through registration
 * 3. Using moderator authentication, attempt to update the member's profile
 * 4. Verify that the operation is rejected with an authorization error
 *
 * This ensures data integrity and prevents unauthorized profile modifications
 * regardless of role hierarchy.
 */
export async function test_api_moderator_cannot_edit_other_profiles(
  connection: api.IConnection,
) {
  // Step 1: Create a member account whose profile will be the target
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a moderator account to test unauthorized edit attempt
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 3: Attempt to update member's profile using moderator authentication
  // The moderator's token is already set in connection headers from the join call
  const profileUpdateData = {
    profile_bio: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    avatar_url: typia.random<string>(),
  } satisfies IRedditLikeUser.IProfileUpdate;

  // Step 4: Validate that the operation is rejected with authorization error
  await TestValidator.error(
    "moderator cannot edit other user's profile",
    async () => {
      await api.functional.redditLike.moderator.users.profile.update(
        connection,
        {
          userId: member.id,
          body: profileUpdateData,
        },
      );
    },
  );
}
