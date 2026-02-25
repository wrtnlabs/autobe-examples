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

export async function test_api_user_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a test user account
  const userConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(joinedUser);
  // Retrieve the user profile (no authentication required for this endpoint)
  const profile = await api.functional.discussionBoard.users.at(connection, {
    userId: joinedUser.id,
  });
  typia.assert(profile);
  // Validate critical business logic matches
  TestValidator.equals("user profile id matches", profile.id, joinedUser.id);
  TestValidator.equals("user email matches", profile.email, joinedUser.email);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    joinedUser.display_name,
  );
  TestValidator.equals("bio is null for new user", profile.bio, null);
  TestValidator.equals(
    "deleted_at is null for active user",
    profile.deleted_at,
    null,
  );
}
