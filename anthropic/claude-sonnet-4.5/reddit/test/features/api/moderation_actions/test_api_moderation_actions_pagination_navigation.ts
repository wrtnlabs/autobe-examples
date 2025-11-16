import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test pagination functionality when browsing through moderation action
 * records.
 *
 * This test validates that the pagination system works correctly for moderation
 * actions:
 *
 * 1. Authenticate as a moderator to gain access to moderation action logs
 * 2. Request page 1 with limit 10 and verify records are returned
 * 3. Request page 2 with limit 10 and verify different records are returned
 * 4. Validate pagination metadata (current page, total records, total pages)
 * 5. Request a page beyond total pages and verify empty data with valid metadata
 *
 * Note: Page numbers in requests are 1-indexed, but pagination.current is
 * 0-indexed
 */
export async function test_api_moderation_actions_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request page 1 with limit 10 (page 1 in request = index 0 in response)
  const page1: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(page1);

  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 current index", page1.pagination.current, 0);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has valid records count",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has valid pages count",
    page1.pagination.pages >= 0,
  );

  // Step 3: Request page 2 with limit 10 (page 2 in request = index 1 in response)
  const page2: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(page2);

  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 current index", page2.pagination.current, 1);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);

  // Validate that different records are returned (if both pages have data)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = page1.data.map((action) => action.id);
    const page2Ids = page2.data.map((action) => action.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    TestValidator.predicate(
      "page 1 and page 2 have different records",
      !hasOverlap,
    );
  }

  // Step 4: Request a page beyond total pages to verify empty result handling
  const beyondPage = page1.pagination.pages + 100;
  const emptyPage: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: beyondPage,
          limit: 10,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(emptyPage);

  // Validate that data is empty but metadata is still valid
  TestValidator.equals(
    "beyond page returns empty data",
    emptyPage.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond page has valid pagination metadata",
    emptyPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "beyond page has valid pages count",
    emptyPage.pagination.pages >= 0,
  );
}
