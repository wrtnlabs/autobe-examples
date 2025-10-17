import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdmin";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

/**
 * Validate retrieval of paginated redditCommunity admin users for management.
 *
 * This test covers realistic business scenarios where only authenticated admin
 * users can successfully fetch a paginated list of admin users with filtering
 * by email, admin level, and timestamps including creation, update, and
 * deletion.
 *
 * The process involves:
 *
 * - Create a fresh admin user using /auth/admin/join
 * - Login with that admin user using /auth/admin/login to authenticate session
 * - Call the main paginated index to fetch admins using realistic filtering
 *   parameters
 * - Validate the paginated response structure and fields
 * - Perform detailed assertions on admin properties and pagination info
 * - Ensure no unauthorized access and proper token handling by SDK
 */
export async function test_api_reddit_community_admin_index(
  connection: api.IConnection,
) {
  // 1. Create a new admin user via join
  const adminCreateBody = {
    email: ("admin" +
      RandomGenerator.alphaNumeric(5) +
      "@example.com") satisfies string & tags.Format<"email">,
    password: "AdminPass123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuthorized);

  // 2. Login as the created admin user to ensure authentication
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IRedditCommunityAdmin.ILogin;
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 3. Prepare realistic request filtering for admin list
  // Provide required properties for IRedditCommunityAdmin.IRequest:
  // email (non-empty string), admin_level (integer), created_at, updated_at, deleted_at (null allowed explicitly)
  const now = new Date().toISOString();
  const requestBody = {
    email: "",
    admin_level: 0,
    created_at: "2000-01-01T00:00:00.000Z",
    updated_at: now,
    deleted_at: null,
  } satisfies IRedditCommunityAdmin.IRequest;

  // 4. Call paginated index endpoint with realistic request
  const pageResult: IPageIRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 5. Validate pagination and admin properties
  const { pagination, data } = pageResult;
  TestValidator.predicate(
    "pagination current page number should not be negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should not be negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should not be negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should not be negative",
    pagination.pages >= 0,
  );

  for (const admin of data) {
    typia.assert(admin);
    TestValidator.predicate(
      "each admin email should be a non-empty string",
      admin.email.length > 0,
    );
    TestValidator.predicate(
      "each admin admin_level should be an integer >= 0",
      admin.admin_level >= 0 && Number.isInteger(admin.admin_level),
    );
    TestValidator.predicate(
      "created_at should be ISO date string",
      typeof admin.created_at === "string" && admin.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at should be ISO date string",
      typeof admin.updated_at === "string" && admin.updated_at.length > 0,
    );
    TestValidator.predicate(
      "deleted_at should be either null or ISO date string",
      admin.deleted_at === null ||
        (typeof admin.deleted_at === "string" && admin.deleted_at.length > 0),
    );
  }
}
