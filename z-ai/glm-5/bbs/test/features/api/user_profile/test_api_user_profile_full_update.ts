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
 * Test the primary success path for updating a user's profile with both display name and biography.
 *
 * **Test Steps:**
 * 1. Register a new user with initial display name 'Initial User'
 * 2. Update the profile with new display name 'Updated DisplayName' and a meaningful bio text
 * 3. Verify the response returns the updated IDiscussionBoardUser object
 * 4. Validate that displayName equals 'Updated DisplayName'
 * 5. Validate that bio equals the provided bio text
 * 6. Confirm memberSince timestamp is preserved (not modified by update)
 * 7. Confirm articleCount and commentCount are present in response
 */
export async function test_api_user_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user with initial display name
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {
    body: {
      displayName: "Initial User",
    },
  });
  typia.assert(authResult);
  const originalMemberSince = authResult.memberSince;
  // 2. Update the profile with new display name and bio
  const newDisplayName = "Updated DisplayName";
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: {
        display_name: newDisplayName,
        bio: newBio,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updatedProfile);
  // 4. Validate displayName equals 'Updated DisplayName'
  TestValidator.equals(
    "display name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // 5. Validate bio equals the provided bio text
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  // 6. Confirm memberSince timestamp is preserved
  TestValidator.equals(
    "memberSince preserved",
    updatedProfile.memberSince,
    originalMemberSince,
  );
  // 7. Confirm articleCount and commentCount are present
  TestValidator.predicate(
    "articleCount is present",
    updatedProfile.articleCount >= 0,
  );
  TestValidator.predicate(
    "commentCount is present",
    updatedProfile.commentCount >= 0,
  );
}
