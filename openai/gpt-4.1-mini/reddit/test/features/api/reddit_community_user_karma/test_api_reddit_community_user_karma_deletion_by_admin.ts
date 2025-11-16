import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";

export async function test_api_reddit_community_user_karma_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const adminPassword = "TestPass123!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create user karma record
  const karmaValue = typia.random<number & tags.Type<"int32">>();
  const karmaRecord: IRedditCommunityUserKarma =
    await api.functional.redditCommunity.admin.redditCommunityUserKarma.create(
      connection,
      {
        body: {
          karma: karmaValue,
        } satisfies IRedditCommunityUserKarma.ICreate,
      },
    );
  typia.assert(karmaRecord);

  // 3. Delete the karma record by id
  await api.functional.redditCommunity.admin.redditCommunityUserKarma.erase(
    connection,
    {
      id: karmaRecord.id,
    },
  );

  // 4. Attempt to delete the same record again and expect error
  await TestValidator.error(
    "deleting non-existent karma record should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityUserKarma.erase(
        connection,
        { id: karmaRecord.id },
      );
    },
  );
}
