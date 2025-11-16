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
 * Test filtering moderation actions by target entity type.
 *
 * This test validates that the moderation action search API correctly filters
 * results based on the target_type parameter, allowing moderators to segment
 * their moderation activity by the type of entity being moderated (posts,
 * comments, users, or reports).
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Search for moderation actions filtered by each target type
 * 3. Validate that results match the specified target_type filter
 * 4. Verify pagination and response structure
 */
export async function test_api_moderation_actions_filter_by_target_type(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Define target types to test
  const targetTypes = ["post", "comment", "user", "report"] as const;

  // Step 3: Test filtering by each target type
  for (const targetType of targetTypes) {
    const searchRequest = {
      page: 1,
      limit: 20,
      target_type: targetType,
    } satisfies IRedditCommunityModerationAction.IRequest;

    const result: IPageIRedditCommunityModerationAction.ISummary =
      await api.functional.redditCommunity.moderator.moderationActions.index(
        connection,
        {
          body: searchRequest,
        },
      );
    typia.assert(result);

    // Validate pagination structure
    TestValidator.predicate(
      "pagination should be valid",
      result.pagination.current >= 0 &&
        result.pagination.limit > 0 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );

    // Validate that all returned actions match the target type filter
    for (const action of result.data) {
      TestValidator.equals(
        `action target type should match filter for ${targetType}`,
        action.target_entity_type,
        targetType,
      );
    }
  }

  // Step 4: Test with null target_type (should return all types)
  const allTypesRequest = {
    page: 1,
    limit: 50,
    target_type: null,
  } satisfies IRedditCommunityModerationAction.IRequest;

  const allTypesResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: allTypesRequest,
      },
    );
  typia.assert(allTypesResult);

  // Validate response structure
  TestValidator.predicate(
    "all types result should have valid pagination",
    allTypesResult.pagination.records >= 0,
  );
}
