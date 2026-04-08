import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing all snapshot records across all entity types.
 *
 * Validates the complete admin snapshot viewing workflow by authenticating as an administrator and retrieving the unified audit trail without any filters. Ensures the snapshot search endpoint returns paginated results with proper metadata and that all snapshot types are accessible to administrators.
 *
 * This test focuses on the primary success path where no filters are applied, demonstrating the comprehensive audit capability of the snapshot system. It verifies pagination metadata accuracy and response structure integrity.
 *
 * 1. Administrator registers with valid credentials and approval reason.
 * 2. Creates admin-specific connection with authentication token.
 * 3. Calls snapshot search endpoint without any filters.
 * 4. Validates response structure includes pagination metadata.
 * 5. Confirms data array exists (may be empty if no snapshots exist).
 * 6. Verifies pagination fields are correctly populated and consistent.
 */
export async function test_api_admin_view_all_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and register
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call snapshot search without filters to get all snapshots
  const result = await api.functional.ecommerce.admin.snapshots.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceSellerSnapshot.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata exists and has valid values
  TestValidator.predicate(
    "pagination current page is number",
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof result.pagination.pages === "number",
  );
  // 4. Validate pagination consistency
  if (result.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      result.pagination.records / result.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      result.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pagination pages when limit is 0",
      result.pagination.pages,
      0,
    );
  }
  // 5. Validate data array exists
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  TestValidator.equals(
    "data length matches records",
    result.data.length,
    result.pagination.records,
  );
}
