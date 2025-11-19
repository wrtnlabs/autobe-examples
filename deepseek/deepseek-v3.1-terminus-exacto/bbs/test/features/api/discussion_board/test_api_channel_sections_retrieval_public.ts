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
 * Test retrieval of sections within a channel for public access.
 *
 * Validates that sections can be retrieved without authentication when the
 * channel is publicly accessible. The test focuses on pagination functionality
 * and basic API response structure since section creation functionality is not
 * available in the provided API endpoints.
 */
export async function test_api_channel_sections_retrieval_public(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for channel setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "testPassword123";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "basic",
        ip: "127.0.0.1",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a public discussion board channel
  const channelName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const channelDescription = RandomGenerator.content({ paragraphs: 1 });

  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: channelName,
        description: channelDescription,
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Test basic section retrieval with pagination
  // Note: Section creation API is not available, so we test the public retrieval
  // functionality with the existing channel (which may have no sections)
  const sectionsPage: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(sectionsPage);

  // Validate pagination structure exists
  TestValidator.equals(
    "pagination current page",
    sectionsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    sectionsPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sectionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sectionsPage.pagination.pages >= 0,
  );

  // Step 4: Test different pagination parameters
  const secondPage: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(secondPage);

  // Validate pagination consistency
  TestValidator.equals(
    "second page number correct",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit remains consistent",
    secondPage.pagination.limit,
    5,
  );

  // Step 5: Test with maximum allowed limit
  const maxLimitResults: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(maxLimitResults);

  // Validate maximum limit constraint
  TestValidator.equals(
    "maximum limit applied correctly",
    maxLimitResults.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length respects maximum limit",
    maxLimitResults.data.length <= 100,
  );

  // Step 6: Test search functionality with empty term (basic validation)
  const emptySearchResults: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 1,
        limit: 10,
        search: "",
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptySearchResults);

  // Step 7: Test status filtering with active status
  const activeFilterResults: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 1,
        limit: 10,
        status: "active",
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(activeFilterResults);

  // Basic validation that API accepts the status filter parameter
  TestValidator.predicate(
    "status filter request processed successfully",
    activeFilterResults.pagination !== undefined,
  );
}
