import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRegisteredUser";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Use admin to search registered users with filters and pagination
  // Prepare realistic search criteria
  /** @type {IRedditCommunityRegisteredUser.IRequest} */
  const searchCriteria = {
    username: RandomGenerator.name(2),
    email: adminEmail,
    status: "active",
    page: 1,
    limit: 10,
    sort_by: "username",
    sort_order: "asc",
  } satisfies IRedditCommunityRegisteredUser.IRequest;

  // 3. Call the search endpoint with the criteria
  const pageResult: IPageIRedditCommunityRegisteredUser.ISummary =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.index(
      connection,
      {
        body: searchCriteria,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination and result data
  TestValidator.predicate(
    "pagination current page >= 1",
    pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit <= 100",
    pageResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    pageResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    pageResult.pagination.records >= pageResult.data.length,
  );

  // 5. For each user in the result, validate username contains search term and email matches
  for (const user of pageResult.data) {
    TestValidator.predicate(
      "user username contains search username",
      user.username.includes(searchCriteria.username ?? ""),
    );
  }
}
