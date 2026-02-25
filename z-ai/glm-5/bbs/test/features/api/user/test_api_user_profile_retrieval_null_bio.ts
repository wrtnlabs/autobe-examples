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
 * Test retrieving a user profile when the bio field is null (not provided during registration).
 *
 * This test validates that:
 * 1. A user can register without providing a bio field
 * 2. The profile retrieval endpoint correctly returns null for missing optional fields
 * 3. All profile fields are properly populated (id, displayName, memberSince, counts)
 */
export async function test_api_user_profile_retrieval_null_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user without providing a bio field
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      displayName: "MinimalUser",
    },
  });
  typia.assert(authorizedUser);
  // 2. Retrieve the user profile using the user ID
  const profile = await api.functional.discussionBoard.users.at(connection, {
    userId: authorizedUser.id,
  });
  typia.assert(profile);
  // 3. Validate the profile response
  TestValidator.equals("id matches", profile.id, authorizedUser.id);
  TestValidator.equals(
    "displayName matches",
    profile.displayName,
    "MinimalUser",
  );
  TestValidator.equals("bio is null", profile.bio, null);
  TestValidator.equals("articleCount is 0", profile.articleCount, 0);
  TestValidator.equals("commentCount is 0", profile.commentCount, 0);
}
