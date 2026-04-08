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
 * Test retrieving paginated list of all active administrator accounts.
 *
 * Validates that a super administrator can successfully retrieve a paginated list
 * of all active administrator accounts on the platform. The test verifies the
 * response structure, pagination metadata, and security requirements.
 *
 * **Validation Points:**
 * - Response contains valid pagination structure with data array
 * - Pagination metadata (current, limit, records, pages) is correct
 * - Each admin record has required fields: id, email, name, created_at, deleted_at
 * - password_hash is NOT included in any response (security requirement)
 * - All returned administrators have deleted_at = null (active accounts only)
 * - Results are sorted by created_at in descending order (newest first)
 *
 * 1. Authenticate as a super administrator using the join endpoint.
 * 2. Send a PATCH request to /ecommerceMall/superAdmin/admins with an empty request body.
 * 3. Validate the response body is a paginated structure.
 * 4. Validate pagination metadata fields.
 * 5. Validate each admin record structure and active status.
 */
export async function test_api_admin_listing_all_active_admins(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Retrieve paginated list of all active administrators
  const response = await api.functional.ecommerceMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {} satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals(
    "response has pagination field",
    "pagination" in response,
    true,
  );
  TestValidator.equals("response has data field", "data" in response, true);
  // 4. Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("default limit is 20", pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  TestValidator.predicate(
    "pages calculation is correct",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 5. Validate each admin record structure
  for (const admin of response.data) {
    // Verify required fields exist
    TestValidator.equals("admin has id field", "id" in admin, true);
    TestValidator.equals("admin has email field", "email" in admin, true);
    TestValidator.equals("admin has name field", "name" in admin, true);
    TestValidator.equals(
      "admin has created_at field",
      "created_at" in admin,
      true,
    );
    TestValidator.equals(
      "admin has deleted_at field",
      "deleted_at" in admin,
      true,
    );
    // Verify password_hash is NOT included (security requirement)
    TestValidator.equals(
      "password_hash not in admin",
      "password_hash" in admin,
      false,
    );
    // Verify active accounts have deleted_at = null
    TestValidator.equals(
      "deleted_at is null for active admin",
      admin.deleted_at,
      null,
    );
  }
  // 6. Verify results are sorted by created_at in descending order (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at);
      const next = new Date(response.data[i + 1].created_at);
      TestValidator.predicate(
        `admin[${i}] created_at >= admin[${i + 1}] created_at (newest first)`,
        current.getTime() >= next.getTime(),
      );
    }
  }
}
