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

export async function test_api_user_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection via join
  const userConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(joinResult);
  // Store original user data for comparison (excluding token)
  const originalUserData = {
    id: joinResult.id,
    username: joinResult.username,
    display_name: joinResult.display_name,
    bio: joinResult.bio,
    avatar_url: joinResult.avatar_url,
    karma: joinResult.karma,
    created_at: joinResult.created_at,
    updated_at: joinResult.updated_at,
    deleted_at: joinResult.deleted_at,
  };
  // Generate new display name within valid range (2-50 characters)
  const newDisplayName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 8,
  }).substring(0, 50);
  // Update only the display name field
  const updateResponse =
    await api.functional.communityPlatform.user.account.update(userConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies ICommunityPlatformUser.IUpdate,
    });
  typia.assert(updateResponse);
  // Validate display name was updated
  TestValidator.equals(
    "display name should be updated",
    updateResponse.display_name,
    newDisplayName,
  );
  // Validate other fields remain unchanged
  TestValidator.equals(
    "username should remain unchanged",
    updateResponse.username,
    originalUserData.username,
  );
  TestValidator.equals(
    "bio should remain unchanged",
    updateResponse.bio,
    originalUserData.bio,
  );
  TestValidator.equals(
    "avatar_url should remain unchanged",
    updateResponse.avatar_url,
    originalUserData.avatar_url,
  );
  TestValidator.equals(
    "karma should remain unchanged",
    updateResponse.karma,
    originalUserData.karma,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updateResponse.created_at,
    originalUserData.created_at,
  );
  // Validate updated_at timestamp reflects the modification
  TestValidator.predicate(
    "updated_at should be newer after modification",
    new Date(updateResponse.updated_at) > new Date(originalUserData.updated_at),
  );
}
