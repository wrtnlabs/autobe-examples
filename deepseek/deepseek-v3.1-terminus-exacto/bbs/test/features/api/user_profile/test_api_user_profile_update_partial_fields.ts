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

export async function test_api_user_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Store initial values for comparison
  const initialDisplayName = user.display_name;
  const initialBio = user.bio;
  const initialEmail = user.email;
  // First update: change only display name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile1 =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: {
        name: newDisplayName,
      } satisfies IDiscussionBoardSection.IUpdate,
    });
  typia.assert(updatedProfile1);
  // Validate first update: display name changed, bio unchanged, email unchanged
  TestValidator.equals(
    "display name updated",
    updatedProfile1.name,
    newDisplayName,
  );
  TestValidator.equals(
    "bio remains unchanged after display name update",
    updatedProfile1.description,
    initialBio,
  );
  TestValidator.equals(
    "email remains unchanged after display name update",
    updatedProfile1.createdByAdmin.email,
    initialEmail,
  );
  // Second update: change only biography
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile2 =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: {
        description: newBio,
      } satisfies IDiscussionBoardSection.IUpdate,
    });
  typia.assert(updatedProfile2);
  // Validate second update: display name preserved, bio changed, email unchanged
  TestValidator.equals(
    "display name preserved after bio update",
    updatedProfile2.name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile2.description, newBio);
  TestValidator.equals(
    "email remains unchanged after bio update",
    updatedProfile2.createdByAdmin.email,
    initialEmail,
  );
  // Final validation: ensure email never changed throughout the process
  TestValidator.equals(
    "email remains constant throughout all updates",
    initialEmail,
    user.email,
  );
}
