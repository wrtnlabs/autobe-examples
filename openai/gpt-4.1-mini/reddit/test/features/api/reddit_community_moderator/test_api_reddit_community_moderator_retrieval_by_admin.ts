import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_reddit_community_moderator_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminInput = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "AdminPassword123!",
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Create a new redditCommunityModerator
  const moderatorInput = {
    email: RandomGenerator.alphaNumeric(10) + "@moderator.com",
    password: "ModeratorPass456!",
  } satisfies IRedditCommunityModerator.ICreate;
  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      { body: moderatorInput },
    );
  typia.assert(moderator);

  // 3. Retrieve the moderator by ID
  const retrievedModerator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.at(
      connection,
      { id: moderator.id },
    );
  typia.assert(retrievedModerator);
  TestValidator.equals(
    "Moderator ID matches",
    retrievedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "Moderator email matches",
    retrievedModerator.email,
    moderator.email,
  );
  TestValidator.equals(
    "Moderator created_at matches",
    retrievedModerator.created_at,
    moderator.created_at,
  );
  TestValidator.equals(
    "Moderator updated_at matches",
    retrievedModerator.updated_at,
    moderator.updated_at,
  );
  TestValidator.equals(
    "Moderator deleted_at matches",
    retrievedModerator.deleted_at ?? null,
    moderator.deleted_at ?? null,
  );

  // 4. Validate retrieval of non-existent moderator ID returns error
  await TestValidator.error(
    "Retrieving non-existent moderator should fail",
    async () => {
      // Generate a random UUID not expected to exist
      const nonExistentId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.redditCommunity.admin.redditCommunityModerators.at(
        connection,
        { id: nonExistentId },
      );
    },
  );
}
