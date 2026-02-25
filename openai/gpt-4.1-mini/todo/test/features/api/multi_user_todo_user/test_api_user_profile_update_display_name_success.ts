import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_update_display_name_success(
  connection: api.IConnection,
): Promise<void> {
  // Test updating the authenticated user's profile display name successfully.
  // The test authenticates as a new user using the join operation.
  // Then it sends a PUT request to update the display name with a valid new value.
  // It asserts that the response contains the updated user profile with the new display name.
  // Also, it verifies that the display name has actually changed in the system.
  // Create a new connection for the user join and authorize the user.
  const userJoinConnection: api.IConnection = { host: connection.host };
  // Prepare join body data
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/",
    ip: null,
  };
  // Authorize user join
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: joinBody,
  });
  // Create user connection authorized with token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${userAuthorized.token.access}` },
  };
  // New display name to update
  const newDisplayName = RandomGenerator.name();
  // Prepare update body
  const updateBody: IMultiUserTodoUser.IUpdate = {
    displayName: newDisplayName,
  };
  // Call the update profile endpoint
  const updatedProfile =
    await api.functional.multiUserTodo.user.profile.updateProfile(
      userConnection,
      { body: updateBody },
    );
  // Assert response type
  typia.assert(updatedProfile);
  // Validate the displayName has been changed
  TestValidator.equals(
    "display name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // Validate the updated profile id matches the authorized user id
  TestValidator.equals("user id matches", updatedProfile.id, userAuthorized.id);
}
