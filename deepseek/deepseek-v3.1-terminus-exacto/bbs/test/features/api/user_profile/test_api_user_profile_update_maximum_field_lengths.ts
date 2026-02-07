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

export async function test_api_user_profile_update_maximum_field_lengths(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  // Generate maximum length values
  const maxDisplayName = RandomGenerator.alphabets(50); // Exactly 50 characters
  const maxBio = RandomGenerator.alphabets(500); // Exactly 500 characters
  // Join user with initial profile data
  const joinedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(joinedUser);
  // Update profile with maximum length values
  // Note: The profile update endpoint returns IDiscussionBoardSection based on the API definition
  const updatedProfile =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: {
        name: maxDisplayName,
        description: maxBio,
      } satisfies IDiscussionBoardSection.IUpdate,
    });
  typia.assert(updatedProfile);
  // Validate the response contains exact maximum length values
  TestValidator.equals(
    "display name matches maximum length",
    updatedProfile.name,
    maxDisplayName,
  );
  TestValidator.equals(
    "bio matches maximum length",
    updatedProfile.description,
    maxBio,
  );
}
