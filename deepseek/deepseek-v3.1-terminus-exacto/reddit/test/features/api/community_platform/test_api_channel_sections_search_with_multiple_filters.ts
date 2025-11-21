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
 * Test advanced section search with multiple filter combinations including
 * status filtering, activity state, name pattern matching, and custom sorting.
 * Validates that complex search queries return accurate results when combining
 * multiple criteria.
 */
export async function test_api_channel_sections_search_with_multiple_filters(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12) satisfies string &
          tags.Format<"password"> as string,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create channel to host sections for complex filtering tests
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

  // 3. Test basic search without filters
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
    "pagination structure",
    basicSearch.pagination.current,
    1,
  );

  // 4. Test search with status filter
  const statusSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
          status: "active",
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(statusSearch);

  // 5. Test search with activity state filter
  const activeSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
          is_active: true,
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(activeSearch);

  // 6. Test search with sorting
  const sortedSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(sortedSearch);

  // 7. Test complex search with multiple filters
  const complexSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
          status: "active",
          is_active: true,
          sort_by: "name",
          order: "asc",
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(complexSearch);

  // 8. Test search with name pattern matching
  const patternSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
          search: "test",
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(patternSearch);

  // 9. Test search with draft status filter
  const draftSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
          status: "draft",
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(draftSearch);

  // 10. Test search with inactive filter
  const inactiveSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
          is_active: false,
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(inactiveSearch);

  // 11. Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    basicSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    basicSearch.pagination.pages >= 0,
  );

  // 12. Validate response data structure
  if (basicSearch.data.length > 0) {
    const section = basicSearch.data[0];
    TestValidator.predicate("section has ID", section.id.length > 0);
    TestValidator.predicate("section has name", section.name.length > 0);
    TestValidator.predicate(
      "section has display name",
      section.display_name.length > 0,
    );
    TestValidator.predicate("section has sort order", section.sort_order >= 0);
    TestValidator.predicate("section has status", section.status.length > 0);
    TestValidator.predicate(
      "section has active state",
      typeof section.is_active === "boolean",
    );
  }

  // 13. Test complex combination with search term and sorting
  const combinedSearch: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.admin.channels.sections.index(
      connection,
      {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 5,
          search: "section",
          status: "active",
          is_active: true,
          sort_by: "sort_order",
          order: "asc",
        } satisfies ICommunityPlatformSection.IRequest,
      },
    );
  typia.assert(combinedSearch);
}
