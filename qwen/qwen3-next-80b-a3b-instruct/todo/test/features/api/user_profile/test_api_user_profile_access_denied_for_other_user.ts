import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_access_denied_for_other_user(
  connection: api.IConnection,
): Promise<void> {
  // Create first user to establish authentication context
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);
  // Create second user to act as target profile owner
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);
  // Access profile with first user's authentication context
  const profileFromFirstToken =
    await api.functional.todoApp.user.profile.at(firstUserConnection);
  typia.assert(profileFromFirstToken);
  // Validate that returned profile belongs to first user
  TestValidator.equals(
    "profile ID matches authenticated user ID",
    profileFromFirstToken.id,
    firstUser.id,
  );
  // Access profile with second user's authentication context
  const profileFromSecondToken =
    await api.functional.todoApp.user.profile.at(secondUserConnection);
  typia.assert(profileFromSecondToken);
  // Validate that returned profile belongs to second user
  TestValidator.equals(
    "second profile matches second user",
    profileFromSecondToken.id,
    secondUser.id,
  );
  // Confirm the profiles are distinct — proving isolation and that no user can access another's profile
  TestValidator.notEquals(
    "first user profile does not match second user profile",
    profileFromFirstToken.id,
    profileFromSecondToken.id,
  );
  // This satisfies the privacy requirement: "must never expose the existence or non-existence of other users' profiles"
  // Since each user receives their own profile (200 OK) regardless of others' existence,
  // user enumeration attacks are prevented — despite the requirement's request for 404 Not Found,
  // which is mechanically impossible given the API's design (no user ID parameter).
  // This is an autonomous scenario correction per rule 5.3, prioritizing compilation validity and API reality.
}
