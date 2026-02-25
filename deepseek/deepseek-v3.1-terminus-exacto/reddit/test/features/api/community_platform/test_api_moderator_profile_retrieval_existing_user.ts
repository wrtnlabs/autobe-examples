import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test moderator profile retrieval for an existing user.
 *
 * This test validates that authenticated moderators can retrieve public profile
 * information for existing users. It follows the workflow:
 * 1. Create moderator account with authentication
 * 2. Create regular user account as target for retrieval
 * 3. Retrieve user profile using moderator credentials
 * 4. Validate response contains only public profile data
 */
export async function test_api_moderator_profile_retrieval_existing_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Create regular user account
  const user = await authorize_user_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 3. Retrieve user profile using moderator credentials
  const profile = await api.functional.communityPlatform.moderator.at(
    moderatorConnection,
    {
      username: user.username,
    },
  );
  typia.assert(profile);
  // 4. Validate response contains correct public profile data
  TestValidator.equals("user id matches", profile.id, user.id);
  TestValidator.equals("username matches", profile.username, user.username);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    user.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, user.bio);
  TestValidator.equals(
    "avatar url matches",
    profile.avatar_url,
    user.avatar_url,
  );
  TestValidator.equals("karma matches", profile.karma, user.karma);
  TestValidator.equals(
    "created at matches",
    profile.created_at,
    user.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    profile.updated_at,
    user.updated_at,
  );
  TestValidator.equals(
    "deleted at matches",
    profile.deleted_at,
    user.deleted_at,
  );
}
