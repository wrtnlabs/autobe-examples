import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";

/**
 * Test that a platform announcement can be retrieved by an unauthenticated
 * user. Validates that the announcement's metadata and content are accurately
 * presented and that permission errors do not occur when only public data is
 * accessed. Also tests retrieval of a non-existent announcement, expecting
 * error handling.
 *
 * Steps:
 *
 * 1. Retrieve an existing or randomly generated platform announcement by its UUID
 *    as a public (unauthenticated) user
 * 2. Assert that all fields & types match dto contract
 * 3. Attempt to retrieve with a non-existent (random) UUID; expect error
 */
export async function test_api_platform_announcement_retrieval_by_public_user(
  connection: api.IConnection,
) {
  // 1. Retrieve an announcement by UUID (simulate by random, as no creation available)
  const announcementId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const announcement: IShoppingPlatformAnnouncement =
    await api.functional.shopping.platformAnnouncements.at(
      { ...connection, headers: {} },
      { platformAnnouncementId: announcementId },
    );
  typia.assert<IShoppingPlatformAnnouncement>(announcement);
  // Basic validity checks
  TestValidator.predicate(
    "announcement id is non-empty uuid",
    typeof announcement.id === "string" && !!announcement.id.length,
  );
  TestValidator.predicate(
    "announcement has a title",
    typeof announcement.title === "string" && !!announcement.title.length,
  );
  TestValidator.predicate(
    "announcement has a body/content",
    typeof announcement.body === "string" && !!announcement.body.length,
  );
  TestValidator.predicate(
    "status is present",
    typeof announcement.status === "string" && !!announcement.status.length,
  );
  TestValidator.predicate(
    "target_audience is present",
    typeof announcement.target_audience === "string" &&
      !!announcement.target_audience.length,
  );
  TestValidator.predicate(
    "admin_id is present",
    typeof announcement.admin_id === "string" && !!announcement.admin_id.length,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof announcement.created_at === "string" &&
      !isNaN(Date.parse(announcement.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof announcement.updated_at === "string" &&
      !isNaN(Date.parse(announcement.updated_at)),
  );

  // 2. Edge case: retrieve a non-existent announcement, expect error
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "retrieving non-existent announcement should fail",
    async () => {
      await api.functional.shopping.platformAnnouncements.at(
        { ...connection, headers: {} },
        { platformAnnouncementId: nonExistentId },
      );
    },
  );
}
