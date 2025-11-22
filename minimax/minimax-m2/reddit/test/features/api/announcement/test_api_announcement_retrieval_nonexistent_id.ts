import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

/**
 * Test retrieving an announcement with a non-existent ID to validate proper
 * error handling and API behavior when accessing resources that don't exist in
 * the system.
 */
export async function test_api_announcement_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentAnnouncementId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to retrieve the non-existent announcement and verify it properly handles the error
  await TestValidator.error(
    "retrieving non-existent announcement should fail",
    async () => {
      await api.functional.redditPlatform.announcements.at(connection, {
        announcementId: nonExistentAnnouncementId,
      });
    },
  );
}
