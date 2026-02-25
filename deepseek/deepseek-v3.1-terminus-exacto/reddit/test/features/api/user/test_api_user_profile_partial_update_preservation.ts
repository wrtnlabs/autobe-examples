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

/**
 * Test partial update behavior where only specific fields are modified while others remain unchanged.
 * Create a user account with initial profile data, then update only the bio field.
 * Verify that the bio field is updated while display_name and avatar_url retain their original values.
 * Validate that the karma score and account timestamps remain consistent with expected behavior.
 */
export async function test_api_user_profile_partial_update_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account with complete profile data
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(joinResponse);
  // Store original values from the authorized response
  const originalDisplayName = joinResponse.display_name;
  const originalAvatarUrl = joinResponse.avatar_url;
  const originalKarma = joinResponse.karma;
  const originalCreatedAt = joinResponse.created_at;
  const originalUpdatedAt = joinResponse.updated_at;
  // 2. Perform partial update - modify only bio field with length constraint
  const updatedBio = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  }) satisfies string & tags.MaxLength<500> as string & tags.MaxLength<500>;
  const updatedUser =
    await api.functional.communityPlatform.user.account.update(userConnection, {
      body: {
        bio: updatedBio,
      } satisfies ICommunityPlatformUser.IUpdate,
    });
  typia.assert(updatedUser);
  // 3. Verify that bio field is updated
  TestValidator.equals("bio should be updated", updatedUser.bio, updatedBio);
  // 4. Verify that display_name and avatar_url remain unchanged (with null safety)
  if (originalDisplayName !== null && updatedUser.display_name !== null) {
    TestValidator.equals(
      "display_name should remain unchanged",
      updatedUser.display_name,
      originalDisplayName,
    );
  } else {
    TestValidator.equals(
      "display_name should both be null",
      updatedUser.display_name,
      originalDisplayName,
    );
  }
  if (originalAvatarUrl !== null && updatedUser.avatar_url !== null) {
    TestValidator.equals(
      "avatar_url should remain unchanged",
      updatedUser.avatar_url,
      originalAvatarUrl,
    );
  } else {
    TestValidator.equals(
      "avatar_url should both be null",
      updatedUser.avatar_url,
      originalAvatarUrl,
    );
  }
  // 5. Validate that karma score remains unchanged
  TestValidator.equals(
    "karma should remain unchanged",
    updatedUser.karma,
    originalKarma,
  );
  // 6. Validate that created_at remains unchanged and updated_at is updated
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedUser.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should be updated",
    updatedUser.updated_at,
    originalUpdatedAt,
  );
}
