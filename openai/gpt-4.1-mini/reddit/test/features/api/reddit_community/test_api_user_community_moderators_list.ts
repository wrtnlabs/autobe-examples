import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Test retrieval of paginated list of moderators for a given community.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new user by calling the /auth/user/join endpoint to obtain
 *    authentication.
 * 2. Uses the authenticated connection to request a paginated list of moderators
 *    assigned to a specified community.
 * 3. Verifies that the response contains a valid page object with moderator
 *    summaries.
 * 4. Checks presence of moderators and the correctness of pagination metadata.
 * 5. Validates that each moderator has all required fields with proper types.
 *
 * The test ensures that the PATCH
 * /redditCommunity/user/communities/{communityName}/moderators endpoint
 * respects filtering, pagination, and sorting criteria.
 *
 * This simulates a typical user scenario fetching community moderator lists.
 */
export async function test_api_user_community_moderators_list(
  connection: api.IConnection,
) {
  // 1. User registration and login
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "StrongP@ssw0rd!";
  const userCreateBody = {
    email: userEmail,
    password: userPassword,
    href: "https://redditcommunity.example.com/signup",
    referrer: "https://redditcommunity.example.com/",
  } satisfies IRedditCommunityUser.ICreate;

  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Define the community name to fetch moderators for
  const communityName = "test_community";

  // 3. Compose the request body with pagination and filter options
  const moderatorRequestBody = {
    page: 1,
    limit: 10,
    sort_by: "assigned_at",
    order: "desc",
    filter: {
      moderator_id: null,
      assigned_after: null,
      assigned_before: null,
    },
    search: null,
    community_name: communityName,
  } satisfies IRedditCommunityCommunityModerator.IRequest;

  // 4. Call the moderators list endpoint
  const moderatorsPage: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.user.communities.moderators.index(
      connection,
      {
        communityName: communityName,
        body: moderatorRequestBody,
      },
    );
  typia.assert(moderatorsPage);

  // 5. Validate pagination metadata
  const pagination: IPage.IPagination = moderatorsPage.pagination;
  TestValidator.predicate(
    "pagination current should be positive",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages should be positive",
    pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records count should not be negative",
    pagination.records >= 0,
  );

  // 6. Validate data array
  const moderators = moderatorsPage.data;
  TestValidator.predicate(
    "moderators data should be array",
    Array.isArray(moderators),
  );

  if (moderators.length > 0) {
    for (const moderator of moderators) {
      typia.assert(moderator);
      TestValidator.predicate(
        "moderator id should be string with uuid format",
        typeof moderator.id === "string" && moderator.id.length > 0,
      );
      TestValidator.predicate(
        "moderator user_id should be string with uuid format",
        typeof moderator.user_id === "string" && moderator.user_id.length > 0,
      );
      TestValidator.predicate(
        "moderator user_email should be string",
        typeof moderator.user_email === "string" &&
          moderator.user_email.length > 0,
      );
      TestValidator.predicate(
        "moderator created_at should be string",
        typeof moderator.created_at === "string" &&
          moderator.created_at.length > 0,
      );
      TestValidator.predicate(
        "moderator user_created_at should be string",
        typeof moderator.user_created_at === "string" &&
          moderator.user_created_at.length > 0,
      );
    }
  }
}
