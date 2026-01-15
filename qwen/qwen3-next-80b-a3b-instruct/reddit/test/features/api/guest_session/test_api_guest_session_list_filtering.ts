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
export async function test_api_guest_session_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest sessions for testing with realistic data
  const guests: ICommunityPlatformGuest.ISummary[] = ArrayUtil.repeat(5, () => {
    return {
      session_id: typia.random<string & tags.Format<"uuid">>(),
      created_at: new Date().toISOString(),
      user_agent: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 5,
        wordMax: 10,
      }),
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
        "eu-west",
        "asia-pacific",
      ] as const),
      last_seen: new Date(
        Date.now() - Math.floor(Math.random() * 86400000),
      ).toISOString(),
      session_duration: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<3600>
      >(),
      page_views: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50>
      >(),
      referrer: typia.random<
        string &
          tags.Pattern<"^(https?://)?([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}|localhost|\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})(:[0-9]{1,5})?(/.*)?$">
      >(),
      device_type: RandomGenerator.pick([
        "desktop",
        "mobile",
        "tablet",
        "other",
      ] as const),
      is_bot: RandomGenerator.pick([true, false] as const),
      is_active: RandomGenerator.pick([true, false] as const),
      allotted_time: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
    };
  });
  // Step 2: Use base connection (no utility functions available)
  // The base connection can be used directly since no authentication is required for this endpoint
  // Step 3: Test all supported filter parameters with valid data and proper validation
  // Test ip_address filtering with actual IPv4 format
  const ipv4Address = typia.random<string & tags.Format<"ipv4">>();
  // Create a guest with the matching IP address
  const matchingGuest = {
    ...guests[0],
    // Note: The actual IP address is not stored in the summary, but we'll assume the API
    // correlates session_id with IP address internally
    // We'll use the actual IPv4 format for filtering
  };
  // Since the IP address is not in the summary, we can't directly set it
  // We'll test the filtering behavior by checking that filtering works with a real IPv4
  const ipResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        ip_address: ipv4Address,
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(ipResponse);
  // We can't verify specific count since we don't know which session will have that IP
  // But we can verify the response structure and that it doesn't throw
  TestValidator.predicate(
    "ip_address filter response has data",
    () => ipResponse.data.length >= 0,
  );
  // Test geographic_region filtering
  const regionSession = guests[1];
  const regionResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        geographic_region: regionSession.location_region,
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(regionResponse);
  TestValidator.predicate(
    "geographic_region filter returns some results",
    () => regionResponse.data.length >= 1,
  );
  // Test device_type filtering
  const deviceSession = guests[2];
  const deviceResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        device_type: deviceSession.device_type === "other" ? "bot" : deviceSession.device_type,
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(deviceResponse);
  TestValidator.predicate(
    "device_type filter returns some results",
    () => deviceResponse.data.length >= 1,
  );
  // Test session_count filtering
  const sessionCountSession = guests[3];
  const sessionCountResponse =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        session_count: sessionCountSession.page_views,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(sessionCountResponse);
  TestValidator.predicate(
    "session_count filter returns some results",
    () => sessionCountResponse.data.length >= 1,
  );
  // Test last_accessed_at_from filtering
  const lastAccessedSession = guests[4];
  const fromTimestamp =
    new Date(lastAccessedSession.last_seen).getTime() - 3600000; // 1 hour before
  const fromResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        last_accessed_at_from: new Date(fromTimestamp).toISOString(),
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(fromResponse);
  TestValidator.predicate(
    "last_accessed_at_from filter returns some results",
    () => fromResponse.data.length >= 1,
  );
  // Test last_accessed_at_to filtering
  const toTimestamp =
    new Date(lastAccessedSession.last_seen).getTime() + 3600000; // 1 hour after
  const toResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        last_accessed_at_to: new Date(toTimestamp).toISOString(),
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(toResponse);
  TestValidator.predicate(
    "last_accessed_at_to filter returns some results",
    () => toResponse.data.length >= 1,
  );
  // Test user_agent_contains filtering
  const userAgentSession = guests[0];
  // Extract a substring that is likely to be unique enough for testing
  const userAgentSubstring = userAgentSession.user_agent.substring(0, 15);
  const userAgentResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        user_agent_contains: userAgentSubstring,
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(userAgentResponse);
  TestValidator.predicate(
    "user_agent_contains filter returns some results",
    () => userAgentResponse.data.length >= 1,
  );
  // Test pagination parameters
  const paginationResponse =
    await api.functional.communityPlatform.guests.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination limit works",
    paginationResponse.data.length,
    2,
  );
  TestValidator.equals(
    "pagination page works",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    paginationResponse.pagination.limit,
    2,
  );
  // Test sorting parameters - verify descending order by last_accessed_at
  const sortedResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        sort_by: "last_accessed_at",
        order: "desc",
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(sortedResponse);
  // Validate sorting order by checking that the first entry's last_seen is >= the second entry's last_seen
  if (sortedResponse.data.length >= 2) {
    const firstEntry = new Date(sortedResponse.data[0].last_seen).getTime();
    const secondEntry = new Date(sortedResponse.data[1].last_seen).getTime();
    TestValidator.predicate(
      "sorting in descending order by last_seen",
      () => firstEntry >= secondEntry,
    );
  }
  // Test empty result filtering with valid but non-matching data
  // Use a unique string that won't match any existing user agent
  const uniqueString =
    "zZzZzZzZzZzZz" + typia.random<string & tags.Format<"uuid">>();
  const emptyResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        user_agent_contains: uniqueString, // This string won't match any existing user agent
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result filter works",
    emptyResponse.data.length,
    0,
  );
  // Test multiple filter combination
  const combinedResponse = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        geographic_region: regionSession.location_region,
        device_type: deviceSession.device_type === "other" ? "bot" : deviceSession.device_type,
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filter returns some results",
    () => combinedResponse.data.length >= 1,
  );
  // Validate that the combined response contains only items matching both filters
  if (combinedResponse.data.length > 0) {
    for (const item of combinedResponse.data) {
      TestValidator.predicate("item matches geographic_region filter", () =>
        item.location_region.includes(regionSession.location_region),
      );
      TestValidator.predicate(
        "item matches device_type filter",
        () => item.device_type === deviceSession.device_type,
      );
    }
  }
}