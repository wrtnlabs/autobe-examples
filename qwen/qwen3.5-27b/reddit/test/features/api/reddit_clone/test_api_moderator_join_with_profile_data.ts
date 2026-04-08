import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test successful moderator account registration with all optional profile fields.
 *
 * Validates the complete moderator registration flow including email authentication, password security requirements, and user profile creation with bio and avatar. Ensures that all provided data is properly persisted and returned in the authentication response.
 *
 * The test verifies that optional fields (bio, avatar) are correctly stored in the user profile and that the moderator account is immediately active with valid authentication tokens.
 *
 * 1. Create moderator connection and register with all fields (email, password, display_name, bio, avatar, href, referrer, ip).
 * 2. Validate response contains IRedditCloneModerator.IAuthorized structure.
 * 3. Verify moderator id, email, and reddit_clone_user_profile_id are present.
 * 4. Confirm userProfile contains display_name, bio, avatar, karma (0), and created_at.
 * 5. Validate token object contains access, refresh, expired_at, and refreshable_until.
 */
export async function test_api_moderator_join_with_profile_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 2. Prepare registration data with all fields
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputDisplayName = RandomGenerator.name();
  const inputBio = RandomGenerator.paragraph({ sentences: 3 });
  const inputAvatar = typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>();
  // 3. Register moderator with all fields including optional bio and avatar
  const output = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: inputEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: inputDisplayName,
      bio: inputBio,
      avatar: inputAvatar,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 4. Validate response structure
  typia.assert(output);
  // 5. Validate moderator data
  TestValidator.equals("email matches input", output.email, inputEmail);
  TestValidator.equals(
    "display name matches input",
    output.userProfile.display_name,
    inputDisplayName,
  );
  // 6. Validate optional fields are present in userProfile
  TestValidator.predicate(
    "bio is present in userProfile",
    output.userProfile.bio !== null,
  );
  TestValidator.equals("bio matches input", output.userProfile.bio, inputBio);
  TestValidator.predicate(
    "avatar is present in userProfile",
    output.userProfile.avatar !== null,
  );
  TestValidator.equals(
    "avatar matches input",
    output.userProfile.avatar,
    inputAvatar,
  );
  // 7. Validate karma is 0 for new user
  TestValidator.equals(
    "karma is 0 for new moderator",
    output.userProfile.karma,
    0,
  );
  // 8. Validate token contains all required fields
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    output.token.refreshable_until.length > 0,
  );
}