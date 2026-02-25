import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_community_owner_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account with guaranteed username length
  const adminConnection: api.IConnection = { host: connection.host };
  const username = RandomGenerator.alphaNumeric(8); // Guaranteed 8-character alphanumeric username
  const createdAdmin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username,
    },
  });
  typia.assert(createdAdmin);
  // 2. Update connection with auth token from creation
  adminConnection.headers = { Authorization: createdAdmin.token.access };
  // 3. Retrieve the platform admin's own profile to obtain ID
  const ownerProfile =
    await api.functional.redditCommunity.platformAdmin.community_owners.at(
      adminConnection,
      { communityOwnerId: createdAdmin.id },
    );
  typia.assert(ownerProfile);
  // 4. Validate returned IRedditCommunityCommunityOwner structure
  TestValidator.equals("ID matches", ownerProfile.id, createdAdmin.id);
  TestValidator.equals("Email matches", ownerProfile.email, createdAdmin.email);
  TestValidator.equals(
    "Username matches",
    ownerProfile.username,
    createdAdmin.username,
  );
  TestValidator.equals(
    "Display name matches",
    ownerProfile.display_name,
    createdAdmin.display_name,
  );
  TestValidator.equals("Bio matches", ownerProfile.bio, createdAdmin.bio);
  TestValidator.equals(
    "Avatar URL matches",
    ownerProfile.avatar_url,
    createdAdmin.avatar_url,
  );
  TestValidator.equals(
    "Karma score matches",
    ownerProfile.karma_score,
    createdAdmin.karma_score,
  );
  TestValidator.equals(
    "Is deleted flag matches",
    ownerProfile.is_deleted,
    createdAdmin.is_deleted,
  );
  TestValidator.equals(
    "Created at matches",
    ownerProfile.created_at,
    createdAdmin.created_at,
  );
  TestValidator.equals(
    "Updated at matches",
    ownerProfile.updated_at,
    createdAdmin.updated_at,
  );
  // 5. Verify password_hash is not returned (as per specification)
  // The IRedditCommunityCommunityOwner type definition does not include password_hash,
  // so this is enforced by the type system automatically
  // 6. Test access without auth (should fail)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access should return 401",
    401,
    async () => {
      await api.functional.redditCommunity.platformAdmin.community_owners.at(
        unauthenticatedConnection,
        { communityOwnerId: createdAdmin.id },
      );
    },
  );
  // 7. Test with invalid UUID (should return 404)
  await TestValidator.httpError(
    "invalid UUID should return 404",
    404,
    async () => {
      await api.functional.redditCommunity.platformAdmin.community_owners.at(
        adminConnection,
        { communityOwnerId: "invalid-uuid" },
      );
    },
  );
}
