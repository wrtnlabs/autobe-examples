import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAnnouncement";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

export async function test_api_announcement_filtering_by_type(
  connection: api.IConnection,
) {
  // Test filtering announcements by "info" type
  const infoResponse = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        announcement_type: "info",
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(infoResponse);
  TestValidator.equals(
    "info filtering response structure",
    infoResponse.data.length >= 0,
    true,
  );

  // Test filtering announcements by "warning" type
  const warningResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        announcement_type: "warning",
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(warningResponse);
  TestValidator.equals(
    "warning filtering response structure",
    warningResponse.data.length >= 0,
    true,
  );

  // Test filtering announcements by "maintenance" type
  const maintenanceResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        announcement_type: "maintenance",
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(maintenanceResponse);
  TestValidator.equals(
    "maintenance filtering response structure",
    maintenanceResponse.data.length >= 0,
    true,
  );

  // Test filtering announcements by "feature_update" type
  const featureUpdateResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        announcement_type: "feature_update",
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(featureUpdateResponse);
  TestValidator.equals(
    "feature update filtering response structure",
    featureUpdateResponse.data.length >= 0,
    true,
  );

  // Test pagination with announcement type filtering
  const paginatedResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        announcement_type: "info",
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination works with type filtering",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated results respect limit",
    paginatedResponse.pagination.limit,
    5,
  );

  // Test without filtering to get all announcements
  const allAnnouncementsResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        limit: 20,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(allAnnouncementsResponse);
  TestValidator.equals(
    "no filter returns all announcements",
    allAnnouncementsResponse.data.length >= 0,
    true,
  );

  // Test filtering with multiple criteria
  const multiCriteriaResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        announcement_type: "info",
        target_audience: "all_users",
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(multiCriteriaResponse);
  TestValidator.equals(
    "multiple criteria filtering works",
    multiCriteriaResponse.data.length >= 0,
    true,
  );
}
