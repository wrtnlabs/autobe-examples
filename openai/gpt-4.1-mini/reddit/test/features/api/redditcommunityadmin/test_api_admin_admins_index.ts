import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdmin";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Test retrieval of a paginated and filtered list of reddit community admin
 * users.
 *
 * Steps:
 *
 * 1. Authenticate as a new admin by performing a join operation.
 * 2. Using the authenticated connection, retrieve a list of admins.
 * 3. Validate the response contains pagination info and valid admin summary data.
 *
 * This validates both authorization and data correctness for admin listing.
 */
export async function test_api_admin_admins_index(connection: api.IConnection) {
  // 1. Admin join to authenticate and set auth token in connection
  const adminCreate: IRedditCommunityAdmin.ICreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(adminAuthorized);

  // 2. Retrieve paginated list of admins with filtering and sorting
  const requestBody: IRedditCommunityAdmin.IRequest = {
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  };
  const response: IPageIRedditCommunityAdmin.ISummary =
    await api.functional.redditCommunity.admin.admins.index(connection, {
      body: requestBody,
    });
  typia.assert(response);

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page must be at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit must be between 1 and 100",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages should be positive",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be positive",
    response.pagination.records >= 0,
  );

  // Validate that each admin summary has required properties
  for (const admin of response.data) {
    TestValidator.predicate(
      "admin id must be a valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.id,
      ),
    );
    TestValidator.predicate(
      "admin user_id must be a valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.user_id,
      ),
    );
    TestValidator.predicate(
      "admin created_at must be ISO 8601 date-time",
      !isNaN(Date.parse(admin.created_at)),
    );
  }
}
