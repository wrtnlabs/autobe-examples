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

export async function test_api_user_profile_update_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Update connection headers with authorization token
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // Store original karma score for verification
  const originalKarma = authorizedUser.karma;
  // Prepare update data with multiple fields
  const updateData: ICommunityPlatformUser.IUpdate = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
  };
  // Update user profile
  const updatedUser =
    await api.functional.communityPlatform.user.account.update(userConnection, {
      body: updateData,
    });
  typia.assert(updatedUser);
  // Validate all updated fields
  TestValidator.equals(
    "display_name updated",
    updatedUser.display_name,
    updateData.display_name,
  );
  TestValidator.equals("bio updated", updatedUser.bio, updateData.bio);
  TestValidator.equals(
    "avatar_url updated",
    updatedUser.avatar_url,
    updateData.avatar_url,
  );
  // Verify preserved fields
  TestValidator.equals(
    "karma score preserved",
    updatedUser.karma,
    originalKarma,
  );
  TestValidator.equals(
    "username preserved",
    updatedUser.username,
    authorizedUser.username,
  );
  TestValidator.equals("id preserved", updatedUser.id, authorizedUser.id);
  // Verify timestamps
  const updatedAt = new Date(updatedUser.updated_at);
  const originalUpdatedAt = new Date(authorizedUser.updated_at);
  TestValidator.predicate(
    "updated_at should be recent",
    updatedAt >= originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedUser.created_at,
    authorizedUser.created_at,
  );
}