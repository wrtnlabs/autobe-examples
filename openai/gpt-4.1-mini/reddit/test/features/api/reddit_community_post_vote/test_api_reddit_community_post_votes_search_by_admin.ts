import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * This test verifies the admin's capability to authenticate as a new admin user
 * and perform filtered, paginated searches on reddit community post votes.
 *
 * The test first registers a new admin user ensuring valid and unique
 * credentials and validates the returned JWT tokens and account properties.
 * Then, it performs search queries with various page and limit parameters to
 * validate filtering, sorting, and pagination. All API responses are validated
 * for correct types and business constraints.
 */
export async function test_api_reddit_community_post_votes_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail: string = `admin.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "AdminPass123!";
  const createBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;

  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedAdmin);

  TestValidator.predicate(
    "Admin account 'is_active' should be true",
    authorizedAdmin.is_active === true,
  );

  TestValidator.predicate(
    "Admin 'role' should be a non-empty string",
    typeof authorizedAdmin.role === "string" && authorizedAdmin.role.length > 0,
  );

  TestValidator.equals(
    "Admin email should match creation email",
    authorizedAdmin.email,
    adminEmail,
  );

  // Check admin settings presence and validity
  TestValidator.predicate(
    "Admin settings should be defined",
    authorizedAdmin.settings !== undefined && authorizedAdmin.settings !== null,
  );

  if (authorizedAdmin.settings) {
    TestValidator.predicate(
      "Admin settings 'theme' should be 'light' or 'dark'",
      authorizedAdmin.settings.theme === "light" ||
        authorizedAdmin.settings.theme === "dark",
    );

    TestValidator.predicate(
      "Admin settings 'notification_email_enabled' should be boolean",
      typeof authorizedAdmin.settings.notification_email_enabled === "boolean",
    );

    TestValidator.predicate(
      "Admin settings 'language' should be non-empty string",
      typeof authorizedAdmin.settings.language === "string" &&
        authorizedAdmin.settings.language.length > 0,
    );

    TestValidator.predicate(
      "Admin settings 'timezone' should be non-empty string",
      typeof authorizedAdmin.settings.timezone === "string" &&
        authorizedAdmin.settings.timezone.length > 0,
    );
  }

  // 2. Perform filtered, paginated search for reddit community post votes

  // Test different page and limit values
  const testPaginationParams: IRedditCommunityPostVote.IRequest[] = [
    { page: 1, limit: 20 },
    { page: 2, limit: 10 },
    { page: 1, limit: 5, orderBy: "created_at", orderDirection: "desc" },
  ];

  for (const params of testPaginationParams) {
    const response: IPageIRedditCommunityPostVote.ISummary =
      await api.functional.redditCommunity.admin.redditCommunityPostVotes.index(
        connection,
        {
          body: params,
        },
      );

    typia.assert(response);

    // Validate pagination metadata
    const pgn = response.pagination;
    TestValidator.predicate(
      "Pagination 'current' page should be positive integer",
      Number.isInteger(pgn.current) && pgn.current > 0,
    );
    TestValidator.predicate(
      "Pagination 'limit' should be positive integer <= 100",
      Number.isInteger(pgn.limit) && pgn.limit > 0 && pgn.limit <= 100,
    );
    TestValidator.predicate(
      "Pagination 'records' should be non-negative integer",
      Number.isInteger(pgn.records) && pgn.records >= 0,
    );
    TestValidator.predicate(
      "Pagination 'pages' should be non-negative integer",
      Number.isInteger(pgn.pages) && pgn.pages >= 0,
    );

    // Validate pagination logical consistency
    TestValidator.predicate(
      "Pagination pages should be at least ceil(records / limit)",
      pgn.pages >= Math.ceil(pgn.records / pgn.limit),
    );

    // Validate each post vote summary in data
    for (const vote of response.data) {
      typia.assert(vote); // full type validation for each vote
      TestValidator.predicate(
        "Vote 'direction' should be either 1 or -1",
        vote.direction === 1 || vote.direction === -1,
      );

      // Voter object validation
      const voter = vote.voter;
      TestValidator.predicate(
        "Voter 'id' should be non-empty string",
        typeof voter.id === "string" && voter.id.length > 0,
      );
      TestValidator.predicate(
        "Voter 'username' should be non-empty string",
        typeof voter.username === "string" && voter.username.length > 0,
      );

      // profile_image_url is optional and may be undefined or null
      if (voter.profile_image_url !== undefined) {
        if (voter.profile_image_url !== null) {
          TestValidator.predicate(
            "Voter 'profile_image_url' should be valid URI string",
            typeof voter.profile_image_url === "string" &&
              voter.profile_image_url.length > 0,
          );
        }
      }
    }
  }
}
