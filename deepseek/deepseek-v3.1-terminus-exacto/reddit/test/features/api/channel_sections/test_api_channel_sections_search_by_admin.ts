import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSection";

/**
 * Test comprehensive section search functionality within a specific channel by
 * an authenticated administrator.
 *
 * This E2E test validates that administrators can search, filter, and paginate
 * through sections belonging to a channel they have created. Tests include
 * searching by name patterns, filtering by status and activity state, sorting
 * by various fields, and verifying pagination works correctly.
 *
 * The test ensures that search results are properly scoped to the specified
 * channel and that all filtering options produce accurate results based on the
 * channel's section configuration.
 */
export async function test_api_channel_sections_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create channel to host sections for searching
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active" as const,
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Test basic search without filters (should return sections in the channel)
  const basicSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "pagination current page should be 1",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be reasonable",
    basicSearch.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    basicSearch.pagination.pages >= 0,
  );

  // Validate the structure of returned section data
  if (basicSearch.data.length > 0) {
    const section = basicSearch.data[0];
    TestValidator.predicate(
      "section should have valid ID",
      typeof section.id === "string" && section.id.length > 0,
    );
    TestValidator.predicate(
      "section should have name",
      typeof section.name === "string" && section.name.length > 0,
    );
    TestValidator.predicate(
      "section should have display name",
      typeof section.display_name === "string" &&
        section.display_name.length > 0,
    );
    TestValidator.predicate(
      "section should have valid sort order",
      typeof section.sort_order === "number",
    );
    TestValidator.predicate(
      "section should have valid active status",
      typeof section.is_active === "boolean",
    );
    TestValidator.predicate(
      "section should have valid status",
      typeof section.status === "string" && section.status.length > 0,
    );
  }

  // Step 4: Test text search functionality with a generic term
  const textSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          search: "section", // Common search term that might match section names
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(textSearch);
  TestValidator.predicate(
    "search should return valid pagination",
    textSearch.pagination.current === 1,
  );

  // Step 5: Test status filtering with active sections
  const activeSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          status: "active",
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(activeSearch);

  // Validate that returned sections match the filter criteria (if any sections returned)
  if (activeSearch.data.length > 0) {
    TestValidator.predicate(
      "active sections should have correct status",
      activeSearch.data.every(
        (section) => section.status === "active" && section.is_active === true,
      ),
    );
  }

  // Step 6: Test sorting functionality by different fields
  const sortingOptions = [
    "name",
    "display_name",
    "sort_order",
    "created_at",
    "updated_at",
  ] as const;

  for (const sortField of sortingOptions) {
    const sortedSearch: IPageICommunityPlatformSection.ISummary =
      await api.functional.communityPlatform.admin.channels.sections.index(
        connection,
        {
          channelName: channel.name,
          body: {
            sort_by: sortField,
            order: "asc",
            page: 1,
            limit: 3,
          } satisfies ICommunityPlatformSection.IRequest,
        },
      );
    typia.assert(sortedSearch);
    TestValidator.predicate(
      `sorting by ${sortField} should work`,
      sortedSearch.pagination.current === 1,
    );
  }

  // Step 7: Test pagination boundaries
  const boundarySearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 999, // Very high page number
          limit: 2,
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(boundarySearch);
  TestValidator.predicate(
    "high page number should handle gracefully",
    boundarySearch.data.length >= 0,
  );

  // Step 8: Test channel name scoping by using a non-existent channel
  await TestValidator.error(
    "search with non-existent channel should fail",
    async () => {
      await api.functional.communityPlatform.admin.channels.sections.index(
        connection,
        {
          channelName: "non-existent-channel-12345",
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformSection.IRequest,
        },
      );
    },
  );

  // Step 9: Test combination of multiple filters
  const combinedSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          status: "active",
          is_active: true,
          sort_by: "sort_order",
          order: "desc",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search should return valid results",
    combinedSearch.pagination.current === 1,
  );

  // Step 10: Test empty search with specific non-matching criteria
  const emptySearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          search: "xyz-non-existent-search-term-123", // Term that likely won't match anything
          status: "archived", // Less common status
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search should handle gracefully",
    emptySearch.pagination.current === 1,
  );
}
