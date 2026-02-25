import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test successful update of moderator profile with complete information.
 * Create a new moderator account via join endpoint, then authenticate.
 * Update all profile fields including display name, biography, and avatar URL.
 * Verify response contains updated fields with proper timestamps.
 * Validate that the moderator's identity information (id, email, username)
 * remains unchanged while profile fields are updated.
 * Check that updated_at timestamp reflects the modification time.
 */
export async function test_api_moderator_account_update_full_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account using utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Prepare complete profile update data
  const updateData: ICommunityPlatformModerator.IUpdate = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
  };
  // 3. Update the moderator profile with complete information
  const updateResult =
    await api.functional.communityPlatform.moderator.account.update(
      moderatorConnection,
      { body: updateData },
    );
  typia.assert(updateResult);
  // 4. Verify that identity fields remain unchanged
  TestValidator.equals("id unchanged", updateResult.id, joinResult.id);
  TestValidator.equals("email unchanged", updateResult.email, joinResult.email);
  TestValidator.equals(
    "username unchanged",
    updateResult.username,
    joinResult.username,
  );
  // 5. Verify that profile fields are updated correctly
  TestValidator.equals(
    "display name updated",
    updateResult.display_name,
    updateData.display_name,
  );
  TestValidator.equals("bio updated", updateResult.bio, updateData.bio);
  TestValidator.equals(
    "avatar URL updated",
    updateResult.avatar_url,
    updateData.avatar_url,
  );
  // 6. Validate that updated_at timestamp reflects the modification time
  const updatedAt = new Date(updateResult.updated_at);
  const createdAt = new Date(joinResult.created_at);
  TestValidator.predicate("updated_at after created_at", updatedAt > createdAt);
}
