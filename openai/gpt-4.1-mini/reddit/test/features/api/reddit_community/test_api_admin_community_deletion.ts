import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";

export async function test_api_admin_community_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new admin user with unique email and password
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.example.com`;
  const adminPassword = "SecurePass123!";
  const adminCreate: IRedditCommunityAdmin.ICreate = {
    email: adminEmail,
    password: adminPassword,
  };

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(adminAuthorized);

  // 2. Define a unique community name to be deleted
  const communityName = `community_${RandomGenerator.alphaNumeric(10)}`;

  // 3. Attempt deletion of the community by the authorized admin
  // Should succeed without error (void return)
  await api.functional.redditCommunity.admin.communities.erase(connection, {
    communityName,
  });

  // 4. Attempt deletion of a non-existent community should throw error
  await TestValidator.error(
    "deleting non-existent community should throw error",
    async () => {
      await api.functional.redditCommunity.admin.communities.erase(connection, {
        communityName: `nonexistent_${RandomGenerator.alphaNumeric(10)}`,
      });
    },
  );
}
