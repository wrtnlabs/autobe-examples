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

export async function test_api_user_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Generate valid profile update data that meets all constraints
  const updateData: ICommunityPlatformUser.IUpdate = {
    display_name: RandomGenerator.name().substring(0, 50) satisfies string &
      tags.MinLength<2> &
      tags.MaxLength<50>,
    bio: RandomGenerator.paragraph({ sentences: 3 }).substring(
      0,
      500,
    ) satisfies string & tags.MaxLength<500>,
    avatar_url: typia.random<
      string & tags.Format<"uri"> & tags.MaxLength<80000>
    >(),
  };
  // Update the user profile
  const updatedProfile =
    await api.functional.communityPlatform.user.profile.update(userConnection, {
      body: updateData,
    });
  typia.assert(updatedProfile);
  // Validate that all provided fields were updated correctly
  TestValidator.equals(
    "display_name should match update",
    updatedProfile.display_name,
    updateData.display_name,
  );
  TestValidator.equals(
    "bio should match update",
    updatedProfile.bio,
    updateData.bio,
  );
  TestValidator.equals(
    "avatar_url should match update",
    updatedProfile.avatar_url,
    updateData.avatar_url,
  );
  // Verify that karma score remains unchanged
  TestValidator.equals(
    "karma should remain unchanged",
    updatedProfile.karma,
    authorizedUser.karma,
  );
  // Verify that user ID remains the same
  TestValidator.equals(
    "user ID should remain unchanged",
    updatedProfile.id,
    authorizedUser.id,
  );
  // Verify that created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedProfile.created_at,
    authorizedUser.created_at,
  );
  // Verify that updated_at timestamp is newer than created_at
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedProfile.updated_at) > new Date(updatedProfile.created_at),
  );
  // Verify that username remains unchanged
  TestValidator.equals(
    "username should remain unchanged",
    updatedProfile.username,
    authorizedUser.username,
  );
  // The email field is not available on ICommunityPlatformUser type
  // This test assertion needs to be removed as email is not part of the profile
}