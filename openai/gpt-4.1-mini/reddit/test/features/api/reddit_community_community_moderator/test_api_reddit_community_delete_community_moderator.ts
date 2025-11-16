import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_reddit_community_delete_community_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin first (essential prerequisite)
  const adminCreateBody = {
    email: RandomGenerator.name(1) + "@redditadmin.com",
    password: "password123",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 2: Create a community moderator account
  const communityModeratorBody = {
    email: RandomGenerator.name(1) + "@moderator.com",
    password: "modpassword123",
    nickname: RandomGenerator.name(1),
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  const moderator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      { body: communityModeratorBody },
    );
  typia.assert(moderator);

  // Step 3: Delete the community moderator account by ID
  await api.functional.redditCommunity.admin.redditCommunity.communityModerators.erase(
    connection,
    { id: moderator.id },
  );

  // Validation: no response, but deletion success means no exception
  TestValidator.predicate("community moderator deletion succeeded", true);
}
