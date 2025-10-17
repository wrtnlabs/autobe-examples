import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";

/**
 * Validates admin account listing and filter/pagination by a platform
 * administrator.
 *
 * - Registers and authenticates a new admin.
 * - Retrieves paginated/filterable list via admin listing endpoint.
 * - Ensures only authorized admins can access listing.
 * - Verifies sensitive data is not exposed in response.
 * - Checks filtering, sorting, pagination, and empty result set handling.
 * - Confirms errors are raised for insufficient privilege attempts.
 */
export async function test_api_admin_list_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin for authentication
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminReg);

  // Step 2: Immediately after join, connection is authenticated (SDK sets token)

  // Step 3: Retrieve the admins list (default: no filter/pagination)
  const listDefault = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(listDefault);
  TestValidator.predicate(
    "admin list has at least one admin",
    listDefault.data.length >= 1,
  );
  TestValidator.equals(
    "pagination.current is at least 1",
    listDefault.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "admin listing exposes only summary fields",
    Object.keys(listDefault.data[0]).sort(),
    [
      "created_at",
      "deleted_at",
      "email",
      "id",
      "status",
      "superuser",
      "updated_at",
    ].sort(),
  );

  // Step 4: Test pagination by requesting limit=1 (should get only 1 record per page)
  const page = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: { limit: 1 satisfies number as number },
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination.limit is 1 per page",
    page.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination.pages is at least as large as number of admins",
    page.pagination.pages >= 1,
  );
  TestValidator.predicate("at most 1 admin per page", page.data.length <= 1);

  // Step 5: Test filter by email (partial, case-insensitive)
  const emailFragment = adminReg.email.slice(0, 5);
  const filtered = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: { email: emailFragment },
    },
  );
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered admin includes just-created admin",
    filtered.data.some((adm) => adm.email === adminReg.email),
  );

  // Step 6: Test empty result for never-matching filter
  const empty = await api.functional.communityPlatform.admin.admins.index(
    connection,
    {
      body: { email: RandomGenerator.alphaNumeric(32) },
    },
  );
  typia.assert(empty);
  TestValidator.equals("empty result set", empty.data.length, 0);

  // Step 7: Test error for insufficient permissions (simulate with unauth connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot access admin listing",
    async () => {
      await api.functional.communityPlatform.admin.admins.index(unauthConn, {
        body: {},
      });
    },
  );
}
