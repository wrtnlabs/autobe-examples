import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator account listing with default pagination parameters.
 *
 * This test verifies that an authenticated administrator can retrieve
 * a paginated list of all administrator accounts on the platform.
 *
 * Validations:
 * 1. Authentication required - only admins can access
 * 2. Response contains paginated data with pagination metadata
 * 3. Each admin summary contains required fields (validated by typia.assert)
 * 4. Default pagination respects maximum limit of 100 per page
 * 5. Created admin appears in the list
 */
export async function test_api_administrator_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Retrieve administrator list with default pagination (empty request body)
  const adminList = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(adminList);
  // Step 3: Validate pagination structure - business logic checks
  TestValidator.predicate(
    "pagination limit respects maximum of 100",
    adminList.pagination.limit >= 1 && adminList.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages is consistent with records and limit",
    adminList.pagination.pages ===
      Math.ceil(adminList.pagination.records / adminList.pagination.limit) ||
      (adminList.pagination.records === 0 && adminList.pagination.pages === 0),
  );
  // Step 4: Verify the created admin appears in the list
  const foundAdmin = adminList.data.find((admin) => admin.id === adminAuth.id);
  TestValidator.predicate(
    "created admin appears in the list",
    foundAdmin !== undefined,
  );
  // Step 5: Verify admin data matches auth response
  if (foundAdmin !== undefined) {
    TestValidator.equals(
      "admin email matches",
      foundAdmin.email,
      adminAuth.email,
    );
    TestValidator.equals("admin name matches", foundAdmin.name, adminAuth.name);
  }
}
