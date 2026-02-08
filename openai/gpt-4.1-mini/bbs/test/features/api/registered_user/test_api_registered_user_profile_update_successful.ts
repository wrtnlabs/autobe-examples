import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_profile_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(joinConnection, {
    body: {
      email: `${RandomGenerator.alphabets(6)}@example.com`,
      password: "P@ssw0rd123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardRegisteredUser.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare new profile data
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const body = {
    display_name: newDisplayName,
    bio: newBio,
  } satisfies IDiscussionBoardRegisteredUser.IUpdate;
  // 3. Update profile
  const updatedProfile =
    await api.functional.discussionBoard.registeredUser.profile.updateProfile(
      userConnection,
      { body },
    );
  typia.assert(updatedProfile);
  // 4. Since properties are not defined in the DTO, omit property specific asserts
  // Only assert that the output type is valid and the update API was successful
  TestValidator.predicate(
    "Update API responded with non-empty object",
    Object.keys(updatedProfile).length > 0,
  );
}
