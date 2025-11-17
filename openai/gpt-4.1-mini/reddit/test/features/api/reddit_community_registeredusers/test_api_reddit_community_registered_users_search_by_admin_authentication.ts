import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRegisteredUser";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_registered_users_search_by_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://example.com/current-page",
        referrer: "https://example.com/referrer-page",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Use admin-authenticated connection to search registered users
  // Testing different valid search params, including pagination and filters

  // Compose search request bodies combining several search criteria
  const searchRequests: IRedditCommunityRegisteredUser.IRequest[] = [
    // Default paging, no filters
    {},
    // Specific pagination
    { page: 1, limit: 20 },
    { page: 2, limit: 10, sortBy: "created_at", sortOrder: "desc" },
    // Filtering by active status
    { filterByStatus: "active" },
    { filterByStatus: "inactive" },
    // Filtering by deleted status
    { filterByStatus: "deleted" },
    // Searching by email keyword
    { search: adminEmail.substring(0, 5) },
    // Searching by username keyword - since username is not in DTO, skip
    // Combined filtering and sorting
    {
      page: 1,
      limit: 50,
      filterByStatus: "active",
      sortBy: "email",
      sortOrder: "asc",
    },
  ];

  // Iterate all search requests to validate
  for (const requestBody of searchRequests) {
    const response: IPageIRedditCommunityRegisteredUser.ISummary =
      await api.functional.redditCommunity.admin.redditCommunityRegisteredusers.index(
        connection,
        { body: requestBody satisfies IRedditCommunityRegisteredUser.IRequest },
      );
    typia.assert(response);

    // Validate pagination properties logical constraints
    TestValidator.predicate(
      "pagination current is positive",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );

    // Validate data array matches pagination limits
    TestValidator.predicate(
      "data length no greater than limit",
      response.data.length <= response.pagination.limit,
    );

    // Validate each user item basic properties and timestamp format
    for (const user of response.data) {
      typia.assert(user);
      TestValidator.predicate(
        "user has valid email format",
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(user.email),
      );

      // Validate id is UUID format
      TestValidator.predicate(
        "user id matches UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          user.id,
        ),
      );

      // Validate timestamps are valid ISO strings
      const created_at = new Date(user.created_at);
      const updated_at = new Date(user.updated_at);
      TestValidator.predicate(
        "user created_at is valid date",
        !isNaN(created_at.getTime()),
      );
      TestValidator.predicate(
        "user updated_at is valid date",
        !isNaN(updated_at.getTime()),
      );

      // deleted_at is null or valid ISO date
      if (user.deleted_at !== null) {
        const deleted_at = new Date(user.deleted_at);
        TestValidator.predicate(
          "user deleted_at is valid date when not null",
          !isNaN(deleted_at.getTime()),
        );
      }
    }
  }
}
