import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_with_complete_profile_data(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection with complete profile data
  const userConnection: api.IConnection = { host: connection.host };
  // Create user with fully populated profile
  const userData = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userData);
  // Retrieve the user profile - No utility function exists for this endpoint, using SDK directly
  const profile =
    await api.functional.communityPlatform.user.profile.at(userConnection);
  typia.assert(profile);
  // Validate that all optional fields are populated correctly and not null
  TestValidator.equals("user id matches", profile.id, userData.id);
  TestValidator.equals("username matches", profile.username, userData.username);
  TestValidator.notEquals(
    "display name is different from username",
    profile.display_name,
    profile.username,
  );
  TestValidator.predicate(
    "display name is populated",
    profile.display_name !== null && profile.display_name !== undefined,
  );
  TestValidator.predicate(
    "bio is populated",
    profile.bio !== null && profile.bio !== undefined,
  );
  TestValidator.predicate(
    "avatar url is populated",
    profile.avatar_url !== null && profile.avatar_url !== undefined,
  );
  TestValidator.equals(
    "display name matches input",
    profile.display_name,
    userData.display_name,
  );
  TestValidator.equals("bio matches input", profile.bio, userData.bio);
  TestValidator.equals(
    "avatar url matches input",
    profile.avatar_url,
    userData.avatar_url,
  );
  TestValidator.equals("karma is 0 for new user", profile.karma, 0);
  TestValidator.predicate(
    "created_at is valid date string",
    typeof profile.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid date string",
    typeof profile.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null for active user",
    profile.deleted_at,
    null,
  );
}
