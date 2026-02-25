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

export async function test_api_user_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Generate a valid display name within constraints (2-50 characters)
  const newDisplayName = RandomGenerator.alphabets(15); // 15 characters, well within 2-50 range
  // Update profile with new display name only (bio remains unchanged)
  const updateBody = {
    display_name: newDisplayName satisfies string,
  } satisfies IDiscussionBoardUser.IUpdate;
  const updatedProfile =
    await api.functional.discussionBoard.user.users.profile.update(
      userConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // Validate the profile update response
  TestValidator.equals(
    "user ID should remain unchanged after update",
    updatedProfile.id,
    user.id,
  );
  TestValidator.equals(
    "email should remain unchanged after update",
    updatedProfile.email,
    user.email,
  );
  TestValidator.equals(
    "display name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "bio should remain null/unchanged",
    updatedProfile.bio,
    user.bio,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedProfile.updated_at,
    user.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedProfile.created_at,
    user.created_at,
  );
  TestValidator.predicate(
    "deleted_at should remain null",
    updatedProfile.deleted_at === null,
  );
}
