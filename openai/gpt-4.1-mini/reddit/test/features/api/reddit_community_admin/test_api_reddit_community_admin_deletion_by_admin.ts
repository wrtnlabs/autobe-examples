import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";

export async function test_api_reddit_community_admin_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and authenticate to get JWT token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityAdmin.IJoin;

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Create a new Reddit community admin account using authenticated token
  const createdAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(20),
        } satisfies IRedditCommunityAdmin.ICreate,
      },
    );
  typia.assert(createdAdmin);

  // Step 3: Delete the created admin account by id using the authorized connection
  await api.functional.redditCommunity.admin.redditCommunityAdmins.erase(
    connection,
    {
      id: createdAdmin.id,
    },
  );

  // Step 4: Verify double deletion fails
  await TestValidator.error(
    "deleting already deleted admin should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityAdmins.erase(
        connection,
        {
          id: createdAdmin.id,
        },
      );
    },
  );
}
