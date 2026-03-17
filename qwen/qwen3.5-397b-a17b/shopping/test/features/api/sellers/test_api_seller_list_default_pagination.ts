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
 * Test the default seller listing functionality without any filters.
 *
 * This test verifies that an administrator can retrieve a paginated list of all
 * seller accounts on the platform. The test validates:
 * 1. Admin authentication for accessing seller management endpoints
 * 2. Default pagination parameters return first page with default limit
 * 3. Response includes proper pagination metadata (current, limit, records, pages)
 * 4. Seller summaries contain all required fields validated by typia.assert()
 * 5. Soft-deleted sellers are excluded from results (handled by backend)
 */
export async function test_api_seller_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve seller list with default pagination parameters
  const result: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
      body: {} satisfies IShoppingMallSeller.IRequest,
    });
  // 3. Validate complete response structure including all seller fields
  typia.assert(result);
  // 4. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    result.pagination !== null,
  );
  TestValidator.predicate(
    "current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within valid range",
    result.pagination.limit > 0 && result.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // 6. Verify pagination consistency
  TestValidator.predicate(
    "pages calculation is correct",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit) ||
      result.pagination.records === 0,
  );
  // 7. Verify data count matches pagination
  TestValidator.predicate(
    "data length matches page size or total",
    result.data.length === result.pagination.records ||
      result.data.length === result.pagination.limit ||
      (result.pagination.records === 0 && result.data.length === 0),
  );
}
