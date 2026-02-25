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

export async function test_api_user_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account using SDK function
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.IJoin;
  const authorized = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorized);
  // Assign token to connection for authenticated requests
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Test partial update: update only bio field while preserving display_name
  const newBio = RandomGenerator.paragraph({ sentences: 2 });
  const bioUpdateResponse =
    await api.functional.discussionBoard.user.users.profile.update(
      userConnection,
      {
        body: {
          bio: newBio,
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(bioUpdateResponse);
  // Verify bio was updated and display_name remains unchanged
  TestValidator.equals(
    "bio should be updated after first update",
    bioUpdateResponse.bio,
    newBio,
  );
  TestValidator.equals(
    "display_name should remain unchanged after bio update",
    bioUpdateResponse.display_name,
    authorized.display_name,
  );
  // 3. Test partial update: update only display_name field while preserving bio
  const newDisplayName = RandomGenerator.name();
  const displayNameUpdateResponse =
    await api.functional.discussionBoard.user.users.profile.update(
      userConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(displayNameUpdateResponse);
  // Verify display_name was updated and bio remains unchanged
  TestValidator.equals(
    "display_name should be updated after second update",
    displayNameUpdateResponse.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "bio should remain unchanged after display_name update",
    displayNameUpdateResponse.bio,
    newBio,
  );
  // 4. Test empty update to ensure no changes occur
  const finalProfile =
    await api.functional.discussionBoard.user.users.profile.update(
      userConnection,
      {
        body: {} satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(finalProfile);
  // Verify nothing changed from previous state
  TestValidator.equals(
    "final display_name should match last update",
    finalProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "final bio should match last update",
    finalProfile.bio,
    newBio,
  );
}
