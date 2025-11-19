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
 * Test section retrieval from an empty discussion board channel.
 *
 * Validates that the API properly handles empty channel scenarios by returning
 * appropriate pagination metadata with zero records. The test follows a
 * comprehensive workflow including moderator authentication, channel creation,
 * and section retrieval with pagination parameters to ensure empty result sets
 * are handled gracefully.
 */
export async function test_api_channel_sections_empty_channel(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.paragraph({ sentences: 2 }),
        password: "testPassword123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        moderation_level: "basic",
        href: "https://example.com/dashboard",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create an empty channel without sections
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Retrieve sections from the empty channel
  const sectionPage: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.channels.sections.index(connection, {
      channelName: channel.name,
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        status: undefined,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(sectionPage);

  // Step 4: Validate empty pagination metadata
  TestValidator.equals(
    "pagination should show 0 records for empty channel",
    sectionPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show 0 pages for empty channel",
    sectionPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    sectionPage.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", sectionPage.pagination.limit, 10);

  // Step 5: Validate empty data array
  TestValidator.predicate(
    "data array should be empty",
    sectionPage.data.length === 0,
  );
}
