import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can successfully retrieve a paginated list
 * of all administrator accounts in the system.
 *
 * **Test Steps:**
 * 1. Register and authenticate as super administrator using the join utility
 * 2. Call the administrators list endpoint without any filters
 * 3. Verify the response contains pagination metadata
 * 4. Verify each administrator record includes required fields
 * 5. Verify password_hash is NOT included in the response
 */
export async function test_api_administrator_list_retrieval_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Call the administrators list endpoint without filters
  const result =
    await api.functional.shoppingMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(result);
  // 3. Verify pagination metadata structure
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate(
    "current page is valid",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", result.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // 5. Verify each administrator record structure and security
  for (const admin of result.data) {
    // Verify password_hash is NOT included (security validation)
    TestValidator.predicate(
      "password_hash not in response",
      !("password_hash" in admin),
    );
  }
  // 6. Verify pagination consistency
  if (result.pagination.records === 0) {
    TestValidator.equals("empty data when no records", result.data.length, 0);
    TestValidator.equals(
      "pages is 0 when no records",
      result.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "data length does not exceed limit",
      result.data.length <= result.pagination.limit,
    );
  }
}
