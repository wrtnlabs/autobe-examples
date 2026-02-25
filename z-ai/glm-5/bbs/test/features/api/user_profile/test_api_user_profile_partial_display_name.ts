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
 * Test partial profile update where only the display name is modified
 * while the biography field remains unchanged.
 *
 * This test verifies that partial updates only modify explicitly provided
 * fields, leaving omitted fields at their original values.
 */
export async function test_api_user_profile_partial_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user with a specific display name
  const userConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = "Original Name";
  const newDisplayName = "Updated Display Name";
  const authResult = await authorize_user_join(userConnection, {
    body: {
      displayName: initialDisplayName,
    },
  });
  typia.assert(authResult);
  // 2. Capture initial bio value (will be null since IJoin doesn't have bio field)
  const initialBio = authResult.bio;
  // 3. Update profile with only display_name (bio field omitted)
  const updatedProfile =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updatedProfile);
  // 4. Validate display_name was updated
  TestValidator.equals(
    "display name should be updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // 5. Validate bio remains unchanged (null from initial registration)
  TestValidator.equals(
    "bio should remain unchanged",
    updatedProfile.bio,
    initialBio,
  );
  // 6. Validate user ID is preserved
  TestValidator.equals(
    "user ID should be preserved",
    updatedProfile.id,
    authResult.id,
  );
}
