import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_community_moderator_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join) for authentication
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "securePassword123",
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a community moderator account
  const moderatorCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "moderatorPass123",
    nickname: RandomGenerator.name(2),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      { body: moderatorCreateBody },
    );
  typia.assert(createdModerator);

  // 3. Retrieve the moderator by their unique ID
  const retrievedModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.at(
      connection,
      { id: createdModerator.id },
    );
  typia.assert(retrievedModerator);

  // 4. Validate equality of created and retrieved moderator
  TestValidator.equals(
    "retrieved moderator id",
    retrievedModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "retrieved moderator email",
    retrievedModerator.email,
    createdModerator.email,
  );
}
