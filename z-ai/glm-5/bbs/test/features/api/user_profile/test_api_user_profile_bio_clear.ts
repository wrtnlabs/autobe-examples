import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test clearing user biography by updating profile with null bio.
 *
 * Verifies that users can remove their biography through the profile update
 * endpoint while preserving other profile information like display name.
 */
export async function test_api_user_profile_bio_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and register with initial bio
  const userConnection: api.IConnection = { host: connection.host };
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const displayName = "Test User";
  const authorized = await authorize_user_join(userConnection, {
    body: {
      displayName,
    },
  });
  typia.assert(authorized);
  // Store initial profile data
  const initialMemberSince = authorized.memberSince;
  // 2. Update profile to set initial bio first (if not already set)
  const profileWithBio =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: {
        bio: initialBio,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(profileWithBio);
  // Verify bio was set
  TestValidator.equals(
    "bio should be set initially",
    profileWithBio.bio,
    initialBio,
  );
  // 3. Clear the bio by updating with null
  const updatedProfile =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: {
        bio: null,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updatedProfile);
  // 4. Validate bio is null (cleared successfully)
  TestValidator.equals(
    "bio should be null after clearing",
    updatedProfile.bio,
    null,
  );
  // 5. Validate display name remains unchanged
  TestValidator.equals(
    "display name should remain unchanged",
    updatedProfile.displayName,
    profileWithBio.displayName,
  );
  // 6. Validate memberSince remains intact
  TestValidator.equals(
    "memberSince should remain intact",
    updatedProfile.memberSince,
    initialMemberSince,
  );
  // 7. Validate user ID remains the same
  TestValidator.equals(
    "user ID should remain the same",
    updatedProfile.id,
    authorized.id,
  );
}
