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

export async function test_api_user_profile_retrieval_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create a test user account via registration
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a fresh connection for profile retrieval (no authentication required)
  const publicConnection: api.IConnection = { host: connection.host };
  // Retrieve the user profile by username
  const profile = await api.functional.communityPlatform.user.at(
    publicConnection,
    {
      username: user.username,
    },
  );
  typia.assert(profile);
  // Validate all public fields are returned correctly
  TestValidator.equals("user id matches", profile.id, user.id);
  TestValidator.equals("username matches", profile.username, user.username);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    user.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, user.bio);
  TestValidator.equals(
    "avatar URL matches",
    profile.avatar_url,
    user.avatar_url,
  );
  TestValidator.equals("karma is initialized to 0", profile.karma, 0);
  // Validate timestamp formats
  TestValidator.predicate(
    "created_at is valid ISO string",
    () => !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    () => !isNaN(Date.parse(profile.updated_at)),
  );
  // Validate that deleted_at is null for active accounts
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
