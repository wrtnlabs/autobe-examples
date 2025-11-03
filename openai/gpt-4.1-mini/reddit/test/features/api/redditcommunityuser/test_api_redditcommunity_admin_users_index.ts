import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUser";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_redditcommunity_admin_users_index(
  connection: api.IConnection,
) {
  // First, authenticate as an admin to gain required permissions.
  const adminCredentials: IRedditCommunityAdmin.ICreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(), // Random valid UUID for user_id
  };
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Define the user request body for listing users
  const userListRequest: IRedditCommunityUser.IRequest = {
    page: 1, // first page
    limit: 20, // page size of 20
    search: null, // no search filter
    email: null, // no specific email filter
    order_by: "email", // order users by email
    order_direction: "asc", // ascending order
  };

  // Call the redditCommunity user index API with admin privileges
  const userListResponse: IPageIRedditCommunityUser.ISummary =
    await api.functional.redditCommunity.admin.users.index(connection, {
      body: userListRequest,
    });

  // Assert the response shape
  typia.assert(userListResponse);

  // Check pagination info
  TestValidator.predicate(
    "pagination current page number should be 1",
    userListResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    userListResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    userListResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    userListResponse.pagination.records >= 0,
  );

  // Validate each user summary in the data array
  for (const user of userListResponse.data) {
    typia.assert(user); // type safe
    TestValidator.predicate(
      "each user has valid UUID id",
      typeof user.id === "string" && /^[0-9a-fA-F-]{36}$/.test(user.id),
    );
    TestValidator.predicate(
      "each user has an email string",
      typeof user.email === "string" && user.email.includes("@"),
    );
  }
}
