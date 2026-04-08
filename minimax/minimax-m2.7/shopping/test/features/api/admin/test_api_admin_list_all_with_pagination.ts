import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator can list all admin accounts with default pagination.
 *
 * Validates the paginated listing of administrator accounts from a super administrator's perspective. This test verifies that the admin listing endpoint returns properly structured paginated data with correct metadata and sorted results.
 *
 * The test flow:
 * 1. Register and authenticate as a super administrator.
 * 2. Call the admin listing endpoint with empty request body (default pagination).
 * 3. Validate response structure contains pagination metadata and data array.
 * 4. Verify each admin summary has required fields: id, email, name, created_at.
 * 5. Confirm results are sorted by created_at descending (newest first).
 * 6. Verify default page size is 20 as per API specification.
 */
export async function test_api_admin_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. List all administrators with default pagination
  const response =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure - pagination metadata
  TestValidator.equals(
    "response has pagination",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  // 4. Validate pagination metadata fields
  const pagination = response.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 1);
  TestValidator.predicate("limit is valid", pagination.limit >= 1);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // 5. Validate default pagination values
  TestValidator.equals("default page size is 20", pagination.limit, 20);
  TestValidator.equals("default page is 1", pagination.current, 1);
  // 6. Validate admin summary structure if data exists
  if (response.data.length > 0) {
    const admin = response.data[0];
    TestValidator.predicate(
      "admin has id",
      admin.id !== undefined && admin.id !== null,
    );
    TestValidator.predicate(
      "admin has email",
      admin.email !== undefined && admin.email !== null,
    );
    TestValidator.predicate(
      "admin has name",
      admin.name !== undefined && admin.name !== null,
    );
    TestValidator.predicate(
      "admin has created_at",
      admin.created_at !== undefined && admin.created_at !== null,
    );
    // 7. Validate sorting (newest first - descending by created_at)
    if (response.data.length > 1) {
      for (let i = 0; i < response.data.length - 1; i++) {
        const current = new Date(response.data[i].created_at).getTime();
        const next = new Date(response.data[i + 1].created_at).getTime();
        TestValidator.predicate(
          `record ${i} is newer or equal to record ${i + 1}`,
          current >= next,
        );
      }
    }
  }
  // 8. Validate records calculation matches data length and pages
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculation correct",
    pagination.pages,
    expectedPages,
  );
}
