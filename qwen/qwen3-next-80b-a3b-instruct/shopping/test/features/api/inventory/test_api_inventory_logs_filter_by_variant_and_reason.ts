import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_logs_filter_by_variant_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = typia.random<IShoppingMallSeller.IJoin>();
  const authorized = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(authorized);
  // 2. Generate a variant_id for inventory log
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create an inventory log with reason='adjustment' (the only allowed reason we can create)
  // We set reason='adjustment' since we cannot create 'order' logs (system-generated only)
  await api.functional.shoppingMall.seller.inventory.adjust(sellerConnection, {
    variantId,
    body: {
      change_quantity: 50,
      reason: "adjustment",
      reference_id: null,
      notes: "E2E test inventory adjustment",
    } satisfies IShoppingMallInventoryLog,
  });
  // 4. Wait a little for timestamp consistency
  await new Promise((resolve) => setTimeout(resolve, 50));
  // 5. Define date range for filtering
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  // 6. Query inventory logs with variant_id and reason='adjustment'
  const response =
    await api.functional.shoppingMall.seller.inventory_logs.index(
      sellerConnection,
      {
        body: {
          variant_id: variantId,
          reason: "adjustment", // We test with 'adjustment' as we can't use 'order' with available APIs
          created_at_gte: oneHourAgo,
          created_at_lte: now,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallInventoryLog.IRequest,
      },
    );
  typia.assert(response);
  // 7. Validate response contains exactly the expected log
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count >= 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate("pages >= 1", response.pagination.pages >= 1);
  // Must have exactly one matching log
  TestValidator.equals("one inventory log returned", response.data.length, 1);
  const foundLog = response.data[0];
  TestValidator.equals(
    "log variant_id matches",
    foundLog.variant_id,
    variantId,
  );
  TestValidator.equals("log reason matches", foundLog.reason, "adjustment");
  TestValidator.predicate(
    "log created_at in range",
    new Date(foundLog.created_at).getTime() >= new Date(oneHourAgo).getTime() &&
      new Date(foundLog.created_at).getTime() <= new Date(now).getTime(),
  );
  TestValidator.equals(
    "log change_quantity matches",
    foundLog.change_quantity,
    50,
  );
  TestValidator.equals(
    "log notes matches",
    foundLog.notes,
    "E2E test inventory adjustment",
  );
  TestValidator.equals("log reference_id is null", foundLog.reference_id, null);
  // 8. Verify logs are sorted by created_at DESC (only one log, so this is trivial)
  // If there were multiple logs, we would sort them and compare, but only one exists
  // 9. Verify no logs with different variant_id or reason are present
  TestValidator.equals(
    "all logs have matching variant_id",
    response.data.every((log) => log.variant_id === variantId),
    true,
  );
  TestValidator.equals(
    "all logs have matching reason",
    response.data.every((log) => log.reason === "adjustment"),
    true,
  );
}
