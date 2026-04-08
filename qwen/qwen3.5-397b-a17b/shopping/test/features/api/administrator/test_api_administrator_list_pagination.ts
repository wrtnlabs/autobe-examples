import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test administrator list pagination with super administrator authentication.
 *
 * Validates the complete administrator listing workflow including super administrator authentication, paginated list retrieval, and response structure validation. Ensures that the pagination metadata is correctly returned and each administrator record contains all required fields including nested member and customer profile information.
 *
 * Special attention is given to verifying that pagination parameters work correctly with default values (page=1, limit=20), and that administrator records are properly structured with grade levels and member associations.
 *
 * 1. Super administrator registers and authenticates using utility function.
 * 2. Requests administrator list with default pagination parameters.
 * 3. Validates pagination metadata structure and values.
 * 4. Validates administrator summary records contain all required fields.
 * 5. Verifies member information includes customer profile data.
 */
export async function test_api_administrator_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Request administrator list with default pagination
  const result =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate administrator records exist
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. Verify sorting by created_at descending (if multiple records exist)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].created_at).getTime();
      const next = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `record ${i} created_at >= record ${i + 1} created_at (descending order)`,
        current >= next,
      );
    }
  }
}
