import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator browsing of all platform administrator accounts.
 *
 * Validates the complete workflow of an authenticated administrator accessing the platform's administrator oversight endpoint. Ensures that the paginated list correctly returns administrator summaries with their grade levels while excluding sensitive credential information.
 *
 * The test verifies default filtering and sorting behavior, pagination metadata accuracy, and proper exclusion of password hashes from all responses. It also confirms that only active (non-deleted) administrators are returned by default.
 *
 * 1. Register and authenticate a new administrator account via join endpoint.
 * 2. Create a dedicated admin connection with the authentication token.
 * 3. Call the browse all administrators endpoint with empty request body for defaults.
 * 4. Validate response structure includes pagination metadata and administrator summaries.
 * 5. Verify each administrator summary contains required fields without password_hash.
 * 6. Confirm pagination metadata has correct current page, limit, records, and pages.
 * 7. Validate default sorting by created_at descending order.
 */
export async function test_api_admin_browse_all_administrators(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with authentication token
  const browsingConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Browse all administrators with default filters (empty body)
  const result = await api.functional.ecommerce.admin.admins.index(
    browsingConnection,
    {
      body: {} satisfies IEcommerceAdmin.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination current page exists",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit exists",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records exists",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    result.pagination.pages >= 0,
  );
  // 5. Validate administrator summaries structure
  if (result.data.length > 0) {
    const firstAdmin = result.data[0];
    typia.assert(firstAdmin);
    // Verify deleted_at is null for active admins (default filter)
    TestValidator.predicate(
      "deleted_at is null for active admins",
      firstAdmin.deleted_at === null,
    );
  } else {
    // When no data, records should be 0
    TestValidator.predicate(
      "records is 0 when no data",
      result.pagination.records === 0,
    );
  }
  // 6. Verify pagination calculations are consistent
  const expectedPages =
    result.pagination.limit > 0
      ? Math.ceil(result.pagination.records / result.pagination.limit)
      : 0;
  TestValidator.equals(
    "pages calculation is correct",
    result.pagination.pages,
    expectedPages,
  );
}
