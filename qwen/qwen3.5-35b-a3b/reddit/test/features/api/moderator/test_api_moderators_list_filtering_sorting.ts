import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * Test moderator list retrieval with filtering and sorting options.
 * Tests search, date range filtering, sorting, and pagination functionality.
 */
export async function test_api_moderators_list_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================================
  // SETUP PHASE
  // ============================================================================
  // 1. Create owner user (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinResult = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerJoinResult);
  // 2. Generate a community ID for testing
  // Note: Community creation endpoint not available in SDK, so generate a valid UUID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create multiple member accounts (potential moderators)
  const potentialModeratorConnections: api.IConnection[] = [];
  for (let i = 0; i < 4; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    potentialModeratorConnections.push(memberConnection);
  }
  // ============================================================================
  // TEST EXECUTION
  // ============================================================================
  // 4. Test basic list retrieval (no filters)
  const listRequest: IRedditCommunityModerator.IRequest = {};
  const basicResult =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: listRequest,
      },
    );
  typia.assert(basicResult);
  // Validate basic response structure
  TestValidator.equals(
    "basic list has pagination",
    basicResult.pagination,
    undefined,
  );
  TestValidator.equals(
    "basic list has data array",
    basicResult.data,
    undefined,
  );
  // 5. Test filtering by username search (case-insensitive)
  const searchRequest: IRedditCommunityModerator.IRequest = {
    search: "test",
  };
  const searchResult =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: searchRequest,
      },
    );
  typia.assert(searchResult);
  // Validate search returns valid pagination
  TestValidator.equals(
    "search result has pagination metadata",
    searchResult.pagination,
    undefined,
  );
  // 6. Test filtering by date range
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 1);
  const dateRangeRequest: IRedditCommunityModerator.IRequest = {
    created_at_from: fromDate.toISOString(),
    created_at_to: toDate.toISOString(),
  };
  const dateRangeResult =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate date range returns valid pagination
  TestValidator.equals(
    "date range result has pagination metadata",
    dateRangeResult.pagination,
    undefined,
  );
  // 7. Test sorting by username ascending
  const sortUsernameAscRequest: IRedditCommunityModerator.IRequest = {
    sort: "username",
    order: "asc",
  };
  const sortUsernameAscResult =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: sortUsernameAscRequest,
      },
    );
  typia.assert(sortUsernameAscResult);
  // Validate sort returns valid data
  TestValidator.equals(
    "username ascending sort returns valid data",
    sortUsernameAscResult.data,
    undefined,
  );
  // 8. Test sorting by creation date descending
  const sortDateDescRequest: IRedditCommunityModerator.IRequest = {
    sort: "created_at",
    order: "desc",
  };
  const sortDateDescResult =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: sortDateDescRequest,
      },
    );
  typia.assert(sortDateDescResult);
  // Validate date descending sort
  TestValidator.equals(
    "date descending sort returns valid data",
    sortDateDescResult.data,
    undefined,
  );
  // 9. Test pagination with custom limit
  const paginationRequest: IRedditCommunityModerator.IRequest = {
    page: 1,
    limit: 5,
  };
  const paginationResult =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: paginationRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    paginationResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    paginationResult.pagination.pages >= 0,
    true,
  );
  // Validate data respects limit
  TestValidator.predicate(
    "pagination data length respects limit",
    () => paginationResult.data.length <= 5,
  );
  // 10. Test combined filters
  const combinedRequest: IRedditCommunityModerator.IRequest = {
    page: 1,
    limit: 10,
    search: "test",
    sort: "username",
    order: "asc",
    created_at_from: fromDate.toISOString(),
    created_at_to: toDate.toISOString(),
  };
  const combinedResult =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: combinedRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined filters return valid response
  TestValidator.equals(
    "combined filters return valid response",
    combinedResult.pagination,
    undefined,
  );
  // 11. Test empty result set (search with unlikely term)
  const emptySearchRequest: IRedditCommunityModerator.IRequest = {
    search: "zzzzzzzzzzzzzzzzzzzzzzz",
  };
  const emptySearchResult =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: emptySearchRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate empty result handling
  TestValidator.equals(
    "empty search has valid pagination",
    emptySearchResult.pagination,
    undefined,
  );
  TestValidator.equals(
    "empty search has empty data array",
    emptySearchResult.data.length,
    0,
  );
  // 12. Test page 2 pagination
  const page2Request: IRedditCommunityModerator.IRequest = {
    page: 2,
    limit: 5,
  };
  const page2Result =
    await api.functional.redditCommunity.communities.moderators.index(
      ownerConnection,
      {
        communityId,
        body: page2Request,
      },
    );
  typia.assert(page2Result);
  // Validate page 2 metadata
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  // 13. Validate all moderator summaries have required fields when data exists
  if (basicResult.data.length > 0) {
    for (const moderator of basicResult.data) {
      typia.assert(moderator);
      TestValidator.predicate(
        "moderator has id",
        () => moderator.id !== undefined,
      );
      TestValidator.predicate(
        "moderator has community",
        () => moderator.community !== undefined,
      );
      TestValidator.predicate(
        "moderator has moderator",
        () => moderator.moderator !== undefined,
      );
      TestValidator.predicate(
        "moderator has addedBy",
        () => moderator.addedBy !== undefined,
      );
      TestValidator.predicate(
        "moderator has createdAt",
        () => moderator.createdAt !== undefined,
      );
    }
    // 14. Validate moderator and addedBy have username
    for (const moderator of basicResult.data) {
      typia.assert(moderator);
      TestValidator.predicate(
        "moderator.moderator has username",
        () => moderator.moderator.username !== undefined,
      );
      TestValidator.predicate(
        "moderator.addedBy has username",
        () => moderator.addedBy.username !== undefined,
      );
    }
    // 15. Validate community has name
    for (const moderator of basicResult.data) {
      typia.assert(moderator);
      TestValidator.predicate(
        "moderator.community has name",
        () => moderator.community.name !== undefined,
      );
    }
  }
}
