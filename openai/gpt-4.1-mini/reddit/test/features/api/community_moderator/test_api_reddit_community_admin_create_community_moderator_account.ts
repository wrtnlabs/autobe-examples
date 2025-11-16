import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_reddit_community_admin_create_community_moderator_account(
  connection: api.IConnection,
) {
  // 1. Admin user account creation (join) and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "superSecurePassword123!";
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Successful creation of community moderator by authenticated admin
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "modPass!2024";
  const moderatorNickname: string = RandomGenerator.name();
  const moderator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: moderatorPassword,
          nickname: moderatorNickname,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  TestValidator.predicate(
    "created community moderator has id",
    typeof moderator.id === "string" && moderator.id.length > 0,
  );
  TestValidator.equals(
    "created email matches request",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof moderator.created_at === "string" && moderator.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof moderator.updated_at === "string" && moderator.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active moderator",
    moderator.deleted_at,
    null,
  );

  // 3. Failure scenario: attempt to create a community moderator with duplicate email
  await TestValidator.error(
    "duplicate email creation throws error",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
        connection,
        {
          body: {
            email: moderatorEmail, // duplicate
            password: "differentPass123",
            nickname: RandomGenerator.name(),
          } satisfies IRedditCommunityCommunityModerator.ICreate,
        },
      );
    },
  );
}
