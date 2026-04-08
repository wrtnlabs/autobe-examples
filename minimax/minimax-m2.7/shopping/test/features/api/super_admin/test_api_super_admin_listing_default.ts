import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that an authenticated super administrator can successfully retrieve a
 * paginated list of all super admin accounts on the platform.
 *
 * Validates the primary success path for super admin account browsing. Submits
 * the request with default pagination parameters (page=1, limit=20) and no
 * filters. Verifies the response returns a valid paginated result containing
 * pagination metadata (current, limit, records, pages) and a data array with
 * super admin summaries. Each summary includes id (UUID format), email,
 * createdAt, updatedAt, and isDeleted boolean fields.
 *
 * Additionally validates that results are sorted by createdAt in descending
 * order (newest first) by default, ensuring consistent ordering behavior.
 *
 * 1. Authenticate as super administrator using authorize_super_admin_join.
 * 2. Call GET /ecommerceMall/superAdmin/superAdmins with default pagination.
 * 3. Validate response structure with typia.assert().
 * 4. Verify pagination metadata fields (current=1, limit=20, records>=0, pages>=0).
 * 5. Validate each data item contains required fields (id, email, createdAt, updatedAt, isDeleted).
 * 6. Verify results are sorted by createdAt descending (newest first).
 */
export async function test_api_super_admin_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call the listing endpoint with default pagination parameters
  const result =
    await api.functional.ecommerceMall.superAdmin.superAdmins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  // 3. Validate response structure
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // 5. Validate each super admin summary in data array
  for (const admin of result.data) {
    // Validate UUID format for id
    TestValidator.predicate(
      "id is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.id,
      ),
    );
    // Validate email format
    TestValidator.predicate(
      "email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email),
    );
    // Validate createdAt is ISO date-time format
    TestValidator.predicate(
      "createdAt is valid date-time",
      !isNaN(Date.parse(admin.createdAt)),
    );
    // Validate updatedAt is ISO date-time format
    TestValidator.predicate(
      "updatedAt is valid date-time",
      !isNaN(Date.parse(admin.updatedAt)),
    );
    // Validate isDeleted is boolean
    TestValidator.predicate(
      "isDeleted is boolean",
      typeof admin.isDeleted === "boolean",
    );
  }
  // 6. Verify results are sorted by createdAt descending (newest first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const currentCreatedAt = new Date(result.data[i].createdAt).getTime();
      const nextCreatedAt = new Date(result.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "sorted by createdAt descending",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
}
