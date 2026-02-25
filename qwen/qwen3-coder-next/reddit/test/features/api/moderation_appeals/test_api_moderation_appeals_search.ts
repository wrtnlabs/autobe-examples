import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationAppeal";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_appeals_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditClone.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Create a community for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create test data with appeals containing different content
  // First, we need to create some moderation reports and appeals
  // Since the appeals.index endpoint is a search endpoint, we'll create appeal data
  // by using the appeals.index endpoint with specific search criteria
  // Create appeals with different content for testing search functionality
  const appealContents = [
    "This appeal is about a content removal decision. I believe the moderation was incorrect.",
    "I want to appeal against the ban. I did not violate any rules.",
    "Please reconsider the post deletion. It was a valid comment.",
    "This appeal is about a different moderation decision. I need clarification.",
    "I am appealing a warning I received. It was unjustified.",
  ];
  // Search with different terms to verify search functionality
  const searchTerm1 = "content removal";
  const searchResults1 =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 20,
          search: searchTerm1,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(searchResults1);
  // Search with partial match (case-insensitive)
  const searchTerm2 = "BAN";
  const searchResults2 =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 20,
          search: searchTerm2,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(searchResults2);
  // Search with no results
  const searchTerm3 = "nonexistent search term";
  const searchResults3 =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 20,
          search: searchTerm3,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(searchResults3);
  TestValidator.equals("no results count", searchResults3.data.length, 0);
  // 4. Test search with multiple appeal contents
  const searchTerm4 = RandomGenerator.paragraph({ sentences: 2 });
  const searchResults4 =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 20,
          search: searchTerm4,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(searchResults4);
  // 5. Test case-insensitive search
  const searchTerm5 = searchTerm4.toUpperCase();
  const searchResults5 =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 20,
          search: searchTerm5,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(searchResults5);
  // Verify case-insensitive search returns same results
  TestValidator.equals(
    "case insensitive search count",
    searchResults4.data.length,
    searchResults5.data.length,
  );
  // 6. Test pagination with search
  const paginatedResults =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 5,
          search: searchTerm4,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals("pagination limit", paginatedResults.data.length, 5);
  TestValidator.equals(
    "pagination count",
    paginatedResults.pagination.limit,
    5,
  );
}
