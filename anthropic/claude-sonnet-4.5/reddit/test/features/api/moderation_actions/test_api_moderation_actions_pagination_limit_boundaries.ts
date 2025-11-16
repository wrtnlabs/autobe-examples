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
 * Test pagination limit boundary conditions for moderation actions search.
 *
 * This test validates that the moderation actions search endpoint correctly
 * handles various pagination limit values including minimum (1), maximum (100),
 * and typical values (20, 50). It ensures that the limit parameter properly
 * controls page size and that pagination metadata accurately reflects the
 * applied limit.
 *
 * Test flow:
 *
 * 1. Authenticate as a moderator
 * 2. Test limit=1 (minimum boundary)
 * 3. Test limit=100 (maximum boundary)
 * 4. Test limit=20 (typical small page)
 * 5. Test limit=50 (typical medium page)
 * 6. Validate pagination metadata and data array sizes for each limit
 */
export async function test_api_moderation_actions_pagination_limit_boundaries(
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

  // Step 2: Test minimum boundary limit=1
  const minLimitResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(minLimitResult);

  TestValidator.equals(
    "min limit metadata",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit data array size",
    minLimitResult.data.length <= 1,
  );

  // Step 3: Test maximum boundary limit=100
  const maxLimitResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "max limit metadata",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data array size",
    maxLimitResult.data.length <= 100,
  );

  // Step 4: Test typical value limit=20
  const typicalSmallResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(typicalSmallResult);

  TestValidator.equals(
    "typical small limit metadata",
    typicalSmallResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "typical small limit data array size",
    typicalSmallResult.data.length <= 20,
  );

  // Step 5: Test typical value limit=50
  const typicalMediumResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(typicalMediumResult);

  TestValidator.equals(
    "typical medium limit metadata",
    typicalMediumResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "typical medium limit data array size",
    typicalMediumResult.data.length <= 50,
  );

  // Step 6: Validate total pages calculation
  // If there are records, verify pages calculation: pages = ceil(records / limit)
  if (minLimitResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      minLimitResult.pagination.records / minLimitResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation with limit=1",
      minLimitResult.pagination.pages,
      expectedPages,
    );
  }
}
