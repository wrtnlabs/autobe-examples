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

export async function test_api_user_profile_retrieval_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Retrieve user profile using authenticated connection
  const profile =
    await api.functional.communityPlatform.user.profile.at(userConnection);
  typia.assert(profile);
  // Validate profile structure and content matches authenticated user data
  TestValidator.equals("user id matches", profile.id, authorizedUser.id);
  TestValidator.equals(
    "username matches",
    profile.username,
    authorizedUser.username,
  );
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, authorizedUser.bio);
  TestValidator.equals(
    "avatar URL matches",
    profile.avatar_url,
    authorizedUser.avatar_url,
  );
  TestValidator.equals("karma matches", profile.karma, authorizedUser.karma);
  TestValidator.equals(
    "created at matches",
    profile.created_at,
    authorizedUser.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    profile.updated_at,
    authorizedUser.updated_at,
  );
  TestValidator.equals(
    "deleted at matches",
    profile.deleted_at,
    authorizedUser.deleted_at,
  );
  // Validate business logic: profile should contain user's information
  TestValidator.predicate(
    "profile contains user data",
    profile.id === authorizedUser.id &&
      profile.username === authorizedUser.username &&
      profile.karma === authorizedUser.karma,
  );
}
