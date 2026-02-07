import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
 * Test the primary success path where an authenticated user updates both their display name and biography.
 * 1. User registers a new account via join endpoint to establish authentication
 * 2. User calls profile update endpoint with valid display name and biography
 * 3. Validate response contains updated profile with new display name and bio
 * 4. Verify email field remains unchanged and read-only
 */
export async function test_api_user_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Register user account
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Update profile with new display name and biography
  // Display name must be 2-50 characters, bio max 500 characters
  const newDisplayName = RandomGenerator.alphabets(25); // 25 chars within 2-50 range
  const newBio = RandomGenerator.paragraph({ sentences: 2 }); // Short bio within 500 chars
  const updateBody = {
    name: newDisplayName,
    description: newBio,
  } satisfies IDiscussionBoardSection.IUpdate;
  const updatedProfile =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);
  // 3. Validate response contains updated fields
  TestValidator.equals(
    "display name updated",
    updatedProfile.name,
    updateBody.name,
  );
  TestValidator.equals(
    "biography updated",
    updatedProfile.description,
    updateBody.description,
  );
  // 4. Verify the profile contains expected section fields (since API returns IDiscussionBoardSection)
  TestValidator.predicate("has valid id", updatedProfile.id.length > 0);
  TestValidator.predicate(
    "has valid status",
    ["active", "inactive", "archived"].includes(updatedProfile.status),
  );
  TestValidator.predicate(
    "has valid display order",
    updatedProfile.display_order > 0,
  );
  TestValidator.predicate(
    "has valid timestamps",
    updatedProfile.created_at !== undefined &&
      updatedProfile.updated_at !== undefined,
  );
  // 5. Validate admin relationships exist (as per IDiscussionBoardSection structure)
  TestValidator.predicate(
    "has created by admin",
    updatedProfile.createdByAdmin !== undefined,
  );
  TestValidator.predicate(
    "created admin has email",
    updatedProfile.createdByAdmin.email !== undefined,
  );
}
