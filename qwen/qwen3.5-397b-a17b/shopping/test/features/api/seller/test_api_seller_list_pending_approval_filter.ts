import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering seller accounts by pending approval status.
 *
 * This test validates that administrators can filter seller accounts
 * by approval status to find sellers awaiting approval review. The test:
 * 1. Authenticates as administrator
 * 2. Requests sellers with approvalStatus filter set to "PENDING"
 * 3. Validates all returned sellers have approval_status = "PENDING"
 * 4. Verifies pagination metadata is correctly populated
 */
export async function test_api_seller_list_pending_approval_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Request sellers with PENDING approval status filter
  const result = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        approvalStatus: "PENDING",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate all returned sellers have approval_status = "PENDING"
  for (const seller of result.data) {
    TestValidator.equals(
      "seller approval status should be PENDING",
      seller.approval_status,
      "PENDING",
    );
  }
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page should be 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate("limit should be 20", result.pagination.limit === 20);
  TestValidator.predicate(
    "records should be non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Validate data array exists
  TestValidator.predicate("data should be array", Array.isArray(result.data));
}
