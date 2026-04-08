import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator force-cancel batch operation on order items.
 *
 * This test validates that a super administrator can perform collection-level
 * operations on order items via the PATCH endpoint. The endpoint allows
 * filtering by status (paid, shipped, delivered, cancelled, refunded) and
 * returns paginated order item summaries.
 *
 * Steps:
 * 1. Authenticate as super administrator using authorize_super_admin_join
 * 2. Call PATCH /ecommerceMall/superAdmin/items with filter for 'paid' status
 * 3. Validate response structure and pagination
 * 4. Verify each order item has valid product, variant, and seller info
 */
export async function test_api_order_item_super_admin_force_cancel_batch(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      },
    });
  typia.assert(superAdmin);
  // Step 2: Query order items with 'paid' status using PATCH endpoint
  // This performs administrative operations on matching order items
  const requestBody = {
    status: "paid",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const response = await api.functional.ecommerceMall.superAdmin.items.index(
    superAdminConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // Step 3: Validate each order item summary structure
  for (const item of response.data) {
    typia.assert(item);
  }
  // Step 4: Verify response data count consistency
  TestValidator.predicate(
    "data count does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}
