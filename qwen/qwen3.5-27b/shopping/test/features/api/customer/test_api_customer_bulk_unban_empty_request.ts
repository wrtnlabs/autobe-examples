import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_customers_bulk_unban_bulk_unban } from "../../../generate/generate_random_shopping_mall_admin_customers_bulk_unban_bulk_unban";
import { prepare_random_shopping_mall_customer_bulk_unban } from "../../../prepare/prepare_random_shopping_mall_customer_bulk_unban";

/**
 * Test bulk unban operation with empty customer IDs array.
 * 1. Register and authenticate as admin
 * 2. Call bulk unban with empty customerIds array
 * 3. Verify response has empty success and failed arrays
 */
export async function test_api_customer_bulk_unban_empty_request(
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
  // 2. Call bulk unban with empty array
  const result =
    await api.functional.shoppingMall.admin.customers.bulk_unban.bulkUnban(
      adminConnection,
      {
        body: {
          customerIds: [],
        } satisfies IShoppingMallCustomerBulkUnban.ICreate,
      },
    );
  typia.assert(result);
  // 3. Verify response structure
  TestValidator.equals("success array is empty", result.success, []);
  TestValidator.equals("failed array is empty", result.failed, []);
  TestValidator.predicate(
    "success array length is 0",
    result.success.length === 0,
  );
  TestValidator.predicate(
    "failed array length is 0",
    result.failed.length === 0,
  );
}
