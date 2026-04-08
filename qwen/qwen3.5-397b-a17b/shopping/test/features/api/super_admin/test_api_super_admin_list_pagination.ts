import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator account listing with default pagination.
 *
 * Validates the complete workflow for retrieving paginated super administrator accounts. The test authenticates as a super administrator, calls the list endpoint with default pagination parameters, and verifies the response structure including pagination metadata and super admin summary objects.
 *
 * The test ensures that the endpoint returns properly formatted pagination information with current page, limit, total records, and total pages. Each super admin summary in the data array is validated to contain all required fields through typia.assert() runtime validation.
 *
 * Special attention is given to verifying the default sorting behavior (createdAt descending - newest first) by checking that the returned records are ordered chronologically with the most recently created accounts appearing first. The pagination metadata is validated to ensure records count matches the data array length and pages calculation is correct.
 *
 * 1. Register a new super administrator account using authorize_super_admin_join utility.
 * 2. Create authenticated connection with the super admin token.
 * 3. Call the super admins list endpoint with default pagination parameters.
 * 4. Validate response structure using typia.assert() for complete type validation.
 * 5. Verify pagination metadata correctly reflects the data array length.
 * 6. Validate sorting order by checking createdAt timestamps are in descending order.
 * 7. Verify pages calculation matches the expected formula.
 */
export async function test_api_super_admin_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call the super admins list endpoint with default pagination
  const result =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate data array length matches pagination records count
  TestValidator.equals(
    "data array length matches records count",
    result.data.length,
    result.pagination.records,
  );
  // 4. Verify sorting order (createdAt descending - newest first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].createdAt).getTime();
      const next = new Date(result.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `record ${i} createdAt >= record ${i + 1} createdAt (descending order)`,
        current >= next,
      );
    }
  }
  // 5. Validate pages calculation
  const expectedPages =
    result.pagination.records === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit);
  TestValidator.equals(
    "pages calculation is correct",
    result.pagination.pages,
    expectedPages,
  );
}
