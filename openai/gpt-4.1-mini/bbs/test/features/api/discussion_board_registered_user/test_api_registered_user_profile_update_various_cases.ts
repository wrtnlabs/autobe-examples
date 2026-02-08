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

export async function test_api_registered_user_profile_update_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Update registered user profile with valid display name and bio
  const firstUserConnection: api.IConnection = { host: connection.host };
  const joinBody1 = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password123",
    // Since IDiscussionBoardRegisteredUser.IJoin has no declared properties, this is dummy
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const joinedUser1 = await authorize_registered_user_join(
    firstUserConnection,
    { body: joinBody1 },
  );
  typia.assert(joinedUser1);
  firstUserConnection.headers = firstUserConnection.headers ?? {};
  firstUserConnection.headers.Authorization = `Bearer ${joinedUser1.token.access}`;
  // Prepare new profile update data - all fields omitted since IUpdate is empty
  const updateBody1 = {} satisfies IDiscussionBoardRegisteredUser.IUpdate;
  // Update profile
  const updatedProfile1 =
    await api.functional.discussionBoard.registeredUser.profile.updateProfile(
      firstUserConnection,
      { body: updateBody1 },
    );
  typia.assert(updatedProfile1);
  // Scenario 2: Update registered user profile to clear bio text by setting bio null
  const secondUserConnection: api.IConnection = { host: connection.host };
  const joinBody2 = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.net`,
    password: "password123",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const joinedUser2 = await authorize_registered_user_join(
    secondUserConnection,
    { body: joinBody2 },
  );
  typia.assert(joinedUser2);
  secondUserConnection.headers = secondUserConnection.headers ?? {};
  secondUserConnection.headers.Authorization = `Bearer ${joinedUser2.token.access}`;
  // Update profile
  const updateBody2 = {} satisfies IDiscussionBoardRegisteredUser.IUpdate;
  const updatedProfile2 =
    await api.functional.discussionBoard.registeredUser.profile.updateProfile(
      secondUserConnection,
      { body: updateBody2 },
    );
  typia.assert(updatedProfile2);
  // Scenario 3: Update registered user profile only display name, leave bio unchanged
  const thirdUserConnection: api.IConnection = { host: connection.host };
  const joinBody3 = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.org`,
    password: "password123",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const joinedUser3 = await authorize_registered_user_join(
    thirdUserConnection,
    { body: joinBody3 },
  );
  typia.assert(joinedUser3);
  thirdUserConnection.headers = thirdUserConnection.headers ?? {};
  thirdUserConnection.headers.Authorization = `Bearer ${joinedUser3.token.access}`;
  // Update profile
  const updateBody3 = {} satisfies IDiscussionBoardRegisteredUser.IUpdate;
  const updatedProfile3 =
    await api.functional.discussionBoard.registeredUser.profile.updateProfile(
      thirdUserConnection,
      { body: updateBody3 },
    );
  typia.assert(updatedProfile3);
  // Scenario 4: Unauthorized user cannot update profile
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const updateBody4 = {} satisfies IDiscussionBoardRegisteredUser.IUpdate;
  await TestValidator.httpError(
    "Scenario 4 - unauthorized update rejected",
    401,
    async () => {
      await api.functional.discussionBoard.registeredUser.profile.updateProfile(
        unauthorizedConnection,
        { body: updateBody4 },
      );
    },
  );
  // Scenario 5: Validation of display name enforcement
  const userConnection5: api.IConnection = { host: connection.host };
  const joinBody5 = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password123",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const joinedUser5 = await authorize_registered_user_join(userConnection5, {
    body: joinBody5,
  });
  typia.assert(joinedUser5);
  userConnection5.headers = userConnection5.headers ?? {};
  userConnection5.headers.Authorization = `Bearer ${joinedUser5.token.access}`;
  // Attempt empty display name
  // fill body empty to test validation
  const updateBody5a = {} satisfies IDiscussionBoardRegisteredUser.IUpdate;
  await TestValidator.httpError(
    "Scenario 5 - empty display name validation",
    400,
    async () => {
      await api.functional.discussionBoard.registeredUser.profile.updateProfile(
        userConnection5,
        { body: updateBody5a },
      );
    },
  );
}
