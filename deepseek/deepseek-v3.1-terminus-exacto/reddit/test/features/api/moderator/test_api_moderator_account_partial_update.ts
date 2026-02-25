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
 * Test partial update scenarios where only specific profile fields are modified.
 * Verify the system preserves existing values for fields not included in the update request.
 * Test single-field updates: update only display name, then separately update biography, then avatar URL.
 * Validate that omitted fields retain their previous values and that the system properly handles null values
 * for optional fields when explicitly set to null.
 */
export async function test_api_moderator_account_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and register account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test_password_123",
    username: RandomGenerator.alphabets(8),
    display_name: "Initial Display Name",
    bio: "Initial biography text",
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderatorAccount = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  typia.assert(moderatorAccount);
  // Test 1: Update only display_name
  const updateDisplayName = {
    display_name: "Updated Display Name",
  } satisfies ICommunityPlatformModerator.IUpdate;
  const afterDisplayNameUpdate =
    await api.functional.communityPlatform.moderator.account.update(
      moderatorConnection,
      { body: updateDisplayName },
    );
  typia.assert(afterDisplayNameUpdate);
  TestValidator.equals(
    "display_name updated",
    afterDisplayNameUpdate.display_name,
    "Updated Display Name",
  );
  TestValidator.equals(
    "bio preserved",
    afterDisplayNameUpdate.bio,
    "Initial biography text",
  );
  TestValidator.equals(
    "avatar_url preserved",
    afterDisplayNameUpdate.avatar_url,
    joinBody.avatar_url,
  );
  // Test 2: Update only bio (partial update - bio only)
  const updateBio = {
    bio: "Updated biography text",
  } satisfies ICommunityPlatformModerator.IUpdate;
  const afterBioUpdate =
    await api.functional.communityPlatform.moderator.account.update(
      moderatorConnection,
      { body: updateBio },
    );
  typia.assert(afterBioUpdate);
  TestValidator.equals(
    "bio updated",
    afterBioUpdate.bio,
    "Updated biography text",
  );
  TestValidator.equals(
    "display_name preserved",
    afterBioUpdate.display_name,
    "Updated Display Name",
  );
  TestValidator.equals(
    "avatar_url preserved",
    afterBioUpdate.avatar_url,
    joinBody.avatar_url,
  );
  // Test 3: Update only avatar_url
  const newAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const updateAvatar = {
    avatar_url: newAvatarUrl,
  } satisfies ICommunityPlatformModerator.IUpdate;
  const afterAvatarUpdate =
    await api.functional.communityPlatform.moderator.account.update(
      moderatorConnection,
      { body: updateAvatar },
    );
  typia.assert(afterAvatarUpdate);
  TestValidator.equals(
    "avatar_url updated",
    afterAvatarUpdate.avatar_url,
    newAvatarUrl,
  );
  TestValidator.equals(
    "display_name preserved",
    afterAvatarUpdate.display_name,
    "Updated Display Name",
  );
  TestValidator.equals(
    "bio preserved",
    afterAvatarUpdate.bio,
    "Updated biography text",
  );
  // Test 4: Test explicit null assignment for optional fields
  const updateWithNulls = {
    bio: null,
    avatar_url: null,
  } satisfies ICommunityPlatformModerator.IUpdate;
  const afterNullUpdate =
    await api.functional.communityPlatform.moderator.account.update(
      moderatorConnection,
      { body: updateWithNulls },
    );
  typia.assert(afterNullUpdate);
  TestValidator.equals("bio set to null", afterNullUpdate.bio, null);
  TestValidator.equals(
    "avatar_url set to null",
    afterNullUpdate.avatar_url,
    null,
  );
  TestValidator.equals(
    "display_name preserved",
    afterNullUpdate.display_name,
    "Updated Display Name",
  );
}
