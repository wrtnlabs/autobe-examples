import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_reddit_community_create_community_moderator(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);
  TestValidator.equals(
    "admin email matches",
    adminAuthorized.email,
    adminEmail,
  );

  // 2. Create a community moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  // Generate a secure password with alphanumeric characters
  const moderatorPassword: string = RandomGenerator.alphaNumeric(16);
  const moderatorNickname: string = RandomGenerator.name(2);
  const moderatorCreateBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    nickname: moderatorNickname,
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  const createdModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      {
        body: moderatorCreateBody,
      },
    );
  typia.assert(createdModerator);

  TestValidator.equals(
    "moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "moderator id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdModerator.id,
    ),
  );
  TestValidator.predicate(
    "moderator created_at is date-time",
    typeof createdModerator.created_at === "string" &&
      createdModerator.created_at.length > 0,
  );
}
