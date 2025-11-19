import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";

/**
 * Validate advanced filtering and search capabilities for channel sections.
 *
 * This test creates a moderator account, establishes a discussion board
 * channel, populates it with sections, then tests various filtering scenarios
 * including text search, pagination, and status-based filtering using the
 * actual section statuses available in the system.
 */
export async function test_api_channel_sections_filtered_search(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        moderation_level: "admin",
        ip: "127.0.0.1",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(15),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create multiple sections with varied content
  const sectionNames = [
    "General Discussion",
    "Technical Support",
    "Announcements",
    "Feedback & Suggestions",
    "Help Center",
  ];

  const createdSections: IDiscussionBoardSection[] = [];

  for (let i = 0; i < sectionNames.length; i++) {
    const section: IDiscussionBoardSection =
      await api.functional.discussionBoard.moderator.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: sectionNames[i],
            description: RandomGenerator.paragraph({ sentences: 4 }),
            channel: {
              id: channel.id,
              name: channel.name,
              description: channel.description,
              status: channel.status,
              created_at: channel.created_at,
            } satisfies IDiscussionBoardChannel.ISummary,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    createdSections.push(section);
  }

  // Step 4: Get all sections to see available statuses
  const allSections: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(allSections);

  // Step 5: Test status-based filtering with actual available statuses
  const availableStatuses = ArrayUtil.repeat(
    allSections.data.length,
    (i) => allSections.data[i].status,
  );
  const uniqueStatuses = [...new Set(availableStatuses)];

  for (const status of uniqueStatuses) {
    const filteredResults: IPageIDiscussionBoardSection.ISummary =
      await api.functional.discussionBoard.channels.sections.index(connection, {
        channelName: channel.name,
        body: {
          page: 1,
          limit: 10,
          status: status as "active" | "inactive" | "archived",
        } satisfies IDiscussionBoardSection.IRequest,
      });
    typia.assert(filteredResults);

    TestValidator.predicate(
      `sections filtered by ${status} status should match status criteria`,
      filteredResults.data.every((section) => section.status === status),
    );

    TestValidator.equals(
      `filtered ${status} sections count should match actual count`,
      filteredResults.data.length,
      allSections.data.filter((s) => s.status === status).length,
    );
  }

  // Step 6: Test text search functionality
  const searchTerm = "Discussion";
  const searchResults: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search results should contain search term in name or description",
    searchResults.data.length === 0 ||
      searchResults.data.some(
        (section) =>
          section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          section.description.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  // Step 7: Test pagination with different page sizes
  const pageSizes = [1, 3, 5] as const;
  for (const pageSize of pageSizes) {
    const paginatedResults: IPageIDiscussionBoardSection.ISummary =
      await api.functional.discussionBoard.channels.sections.index(connection, {
        channelName: channel.name,
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IDiscussionBoardSection.IRequest,
      });
    typia.assert(paginatedResults);

    TestValidator.equals(
      `page size ${pageSize} should return correct number of items`,
      paginatedResults.data.length,
      Math.min(pageSize, paginatedResults.pagination.records),
    );

    TestValidator.predicate(
      `pagination metadata for page size ${pageSize} should be accurate`,
      paginatedResults.pagination.limit === pageSize &&
        paginatedResults.pagination.current === 1 &&
        paginatedResults.pagination.records >= 0 &&
        paginatedResults.pagination.pages >= 1,
    );
  }

  // Step 8: Test combined filters (status + search) - only if both conditions exist
  if (uniqueStatuses.length > 0) {
    const firstStatus = uniqueStatuses[0];
    const sectionsWithStatus = allSections.data.filter(
      (s) => s.status === firstStatus,
    );

    if (sectionsWithStatus.length > 0) {
      const searchableTerm = sectionsWithStatus[0].name.substring(0, 5);

      const combinedResults: IPageIDiscussionBoardSection.ISummary =
        await api.functional.discussionBoard.channels.sections.index(
          connection,
          {
            channelName: channel.name,
            body: {
              page: 1,
              limit: 10,
              status: firstStatus as "active" | "inactive" | "archived",
              search: searchableTerm,
            } satisfies IDiscussionBoardSection.IRequest,
          },
        );
      typia.assert(combinedResults);

      TestValidator.predicate(
        "combined filter results should match both status and search criteria",
        combinedResults.data.every(
          (section) =>
            section.status === firstStatus &&
            (section.name
              .toLowerCase()
              .includes(searchableTerm.toLowerCase()) ||
              section.description
                .toLowerCase()
                .includes(searchableTerm.toLowerCase())),
        ),
      );
    }
  }

  // Step 9: Test empty result scenario
  const emptyResults: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 1,
        limit: 10,
        search: "NonExistentTerm12345",
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptyResults);

  TestValidator.equals(
    "search for non-existent term should return empty results",
    emptyResults.data.length,
    0,
  );
}
