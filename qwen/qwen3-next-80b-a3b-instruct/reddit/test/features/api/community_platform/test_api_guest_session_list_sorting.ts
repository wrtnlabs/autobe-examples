import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
export async function test_api_guest_session_list_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data with controlled sorting values
  // We need multiple guest sessions with varying values for sorting fields
  const sessionCount = 5;
  // Create a list of guest sessions with predictable values for sorting
  // We'll use fixed values for each field to ensure predictable sort order
  const guests = ArrayUtil.repeat(
    sessionCount,
    (index) =>
      ({
        session_id: typia.random<string & tags.Format<"uuid">>(),
        created_at: new Date(2026, 0, 1, 10, 0, 0, 0).toISOString(), // Same for all
        user_agent: typia.random<string & tags.MaxLength<500>>(),
        location_country: RandomGenerator.pick([
          "US",
          "JP",
          "DE",
          "BR",
          "CA",
        ] as const),
        location_city: RandomGenerator.name(),
        location_region: RandomGenerator.pick([
          "north_america",
          "asia_pacific",
          "europe",
        ] as const),
        last_seen: new Date(2026, 0, 1, 10 + index, 0, 0, 0).toISOString(), // Increasing by index
        session_duration: index * 60, // 0, 60, 120, 180, 240 seconds
        page_views: index + 1, // 1, 2, 3, 4, 5 views
        device_type: RandomGenerator.pick([
          "desktop",
          "mobile",
          "tablet",
          "other",
        ] as const),
        is_bot: false,
        is_active: true,
        allotted_time: 3600,
        referrer: "", // Added required referrer property with default empty string value
      }) satisfies ICommunityPlatformGuest.ISummary,
  );
  // Sort the data manually to create expected order
  // Sort by last_accessed_at (last_seen) ascending
  const sortedByLastAccessedAsc = [...guests].sort(
    (a, b) => new Date(a.last_seen).getTime() - new Date(b.last_seen).getTime(),
  );
  // Sort by last_accessed_at (last_seen) descending (default)
  const sortedByLastAccessedDesc = [...guests].sort(
    (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime(),
  );
  // Sort by session_duration ascending
  const sortedBySessionDurationAsc = [...guests].sort(
    (a, b) => a.session_duration - b.session_duration,
  );
  // Sort by session_duration descending
  const sortedBySessionDurationDesc = [...guests].sort(
    (a, b) => b.session_duration - a.session_duration,
  );
  // Sort by geographic_location (location_region) ascending
  const sortedByLocationAsc = [...guests].sort((a, b) => {
    const regionA = a.location_region.toLowerCase();
    const regionB = b.location_region.toLowerCase();
    if (regionA < regionB) return -1;
    if (regionA > regionB) return 1;
    return 0;
  });
  // Sort by geographic_location (location_region) descending
  const sortedByLocationDesc = [...guests].sort((a, b) => {
    const regionA = a.location_region.toLowerCase();
    const regionB = b.location_region.toLowerCase();
    if (regionA < regionB) return 1;
    if (regionA > regionB) return -1;
    return 0;
  });
  // Test 1: Default sort order (last_accessed_at descending)
  const defaultSortResponse: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        page: 1,
        limit: sessionCount,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(defaultSortResponse);
  TestValidator.equals(
    "default sort order is last_accessed_at descending",
    defaultSortResponse.data.map((g) => g.session_id),
    sortedByLastAccessedDesc.map((g) => g.session_id),
  );
  // Test 2: Sort by last_accessed_at ascending
  const sortByLastAccessedAscResponse: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        page: 1,
        limit: sessionCount,
        sort_by: "last_accessed_at",
        order: "asc",
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(sortByLastAccessedAscResponse);
  TestValidator.equals(
    "sort by last_accessed_at ascending",
    sortByLastAccessedAscResponse.data.map((g) => g.session_id),
    sortedByLastAccessedAsc.map((g) => g.session_id),
  );
  // Test 3: Sort by last_accessed_at descending (explicit)
  const sortByLastAccessedDescResponse: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        page: 1,
        limit: sessionCount,
        sort_by: "last_accessed_at",
        order: "desc",
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(sortByLastAccessedDescResponse);
  TestValidator.equals(
    "sort by last_accessed_at descending",
    sortByLastAccessedDescResponse.data.map((g) => g.session_id),
    sortedByLastAccessedDesc.map((g) => g.session_id),
  );
  // Test 4: Sort by session_duration ascending
  const sortBySessionDurationAscResponse: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        page: 1,
        limit: sessionCount,
        sort_by: "session_duration",
        order: "asc",
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(sortBySessionDurationAscResponse);
  TestValidator.equals(
    "sort by session_duration ascending",
    sortBySessionDurationAscResponse.data.map((g) => g.session_id),
    sortedBySessionDurationAsc.map((g) => g.session_id),
  );
  // Test 5: Sort by session_duration descending
  const sortBySessionDurationDescResponse: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        page: 1,
        limit: sessionCount,
        sort_by: "session_duration",
        order: "desc",
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(sortBySessionDurationDescResponse);
  TestValidator.equals(
    "sort by session_duration descending",
    sortBySessionDurationDescResponse.data.map((g) => g.session_id),
    sortedBySessionDurationDesc.map((g) => g.session_id),
  );
  // Test 6: Sort by geographic_location ascending
  const sortByLocationAscResponse: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        page: 1,
        limit: sessionCount,
        sort_by: "geographic_location",
        order: "asc",
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(sortByLocationAscResponse);
  TestValidator.equals(
    "sort by geographic_location ascending",
    sortByLocationAscResponse.data.map((g) => g.session_id),
    sortedByLocationAsc.map((g) => g.session_id),
  );
  // Test 7: Sort by geographic_location descending
  const sortByLocationDescResponse: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        page: 1,
        limit: sessionCount,
        sort_by: "geographic_location",
        order: "desc",
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(sortByLocationDescResponse);
  TestValidator.equals(
    "sort by geographic_location descending",
    sortByLocationDescResponse.data.map((g) => g.session_id),
    sortedByLocationDesc.map((g) => g.session_id),
  );
}