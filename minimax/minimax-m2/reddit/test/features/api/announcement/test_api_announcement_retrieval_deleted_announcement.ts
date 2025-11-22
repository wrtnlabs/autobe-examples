import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

export async function test_api_announcement_retrieval_deleted_announcement(
  connection: api.IConnection,
) {
  // Test accessing an announcement that may not exist or be deleted
  // This validates access control for archived announcements

  const announcementId = typia.random<string & tags.Format<"uuid">>();

  // Test attempting to retrieve a potentially deleted/non-existent announcement
  // This should validate the system's handling of archived or removed announcements
  await TestValidator.error(
    "should reject access to non-existent or deleted announcement",
    async () => {
      await api.functional.redditPlatform.announcements.at(connection, {
        announcementId: announcementId,
      });
    },
  );
}
