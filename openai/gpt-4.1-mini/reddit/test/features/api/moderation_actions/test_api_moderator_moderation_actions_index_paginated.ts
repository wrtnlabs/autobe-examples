import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * Test that a moderator user can retrieve a paginated and filtered list of
 * their own moderation actions.
 *
 * 1. Authenticate a moderator user via the join API.
 * 2. Use the authenticated moderator's ID to request moderation actions with
 *    pagination and filtering.
 * 3. Verify the returned pagination data and moderation action summaries conform
 *    to expectations.
 * 4. Assert that the data entries belong to the moderator and have required
 *    properties.
 * 5. Validate pagination fields like current page, limit, total records, and
 *    number of pages.
 * 6. Test sorting and filtering through preset parameters.
 * 7. Ensure the API calls use correct types and the authorization token is handled
 *    automatically.
 */
export async function test_api_moderator_moderation_actions_index_paginated(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator user
  const joinBody = {
    email: `moderator${RandomGenerator.alphaNumeric(8)}@testdomain.com`,
    password: "password123",
    href: "https://redditcommunity.test/current",
    referrer: "https://redditcommunity.test/previous",
  } satisfies IRedditCommunityModerator.IJoin;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: joinBody });
  typia.assert(moderator);

  // Step 2: Request moderation actions listing
  const paginationBody: IRedditCommunityModerationAction.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    order: "desc",
    filter: {
      actionType: "deleted",
      createdAfter: "2020-01-01T00:00:00.000Z",
      createdBefore: new Date().toISOString(),
    },
  };

  const moderationActions: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.actions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: paginationBody,
      },
    );

  typia.assert(moderationActions);

  // Step 3: Validate pagination info
  const pagination: IPage.IPagination = moderationActions.pagination;

  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is equal or greater than 0",
    pagination.pages >= 0,
  );

  // Step 4: Validate each moderation action summary entry
  for (const action of moderationActions.data) {
    typia.assert(action);

    TestValidator.equals(
      "moderation action's moderatorId equals authenticated moderator id",
      action.moderator_id,
      moderator.id,
    );

    TestValidator.predicate(
      "moderation action's action type is 'deleted'",
      action.action_type === "deleted",
    );

    // Validate that timestamps are non-empty
    TestValidator.predicate(
      "moderation action created_at is not empty",
      action.created_at.length > 0,
    );

    TestValidator.predicate(
      "moderation action updated_at is not empty",
      action.updated_at.length > 0,
    );
  }
}
