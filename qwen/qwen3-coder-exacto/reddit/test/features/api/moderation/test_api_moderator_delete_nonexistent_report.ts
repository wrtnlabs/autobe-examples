import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_delete_nonexistent_report(
  connection: api.IConnection,
) {
  // First, authenticate as a moderator to get authorization tokens
  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        community_forum_user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityForumCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Generate a random UUID for a non-existent report
  const nonexistentReportId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete the non-existent report and expect an error
  await TestValidator.error(
    "should fail when deleting non-existent report",
    async () => {
      await api.functional.communityForum.moderator.reports.erase(connection, {
        reportId: nonexistentReportId,
      });
    },
  );
}
