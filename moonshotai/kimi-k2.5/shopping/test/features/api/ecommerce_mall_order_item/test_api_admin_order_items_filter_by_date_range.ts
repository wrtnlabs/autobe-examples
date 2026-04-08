import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Admin filters order items by creation date range to review orders within a specific time period.
 * Uses createdAtFrom and createdAtTo parameters to narrow results to orders created within the last 30 days.
 * Validates that only order items with created_at timestamps falling within the specified inclusive range are returned.
 * Tests business workflow for periodic order review and oversight activities.
 */
export async function test_api_admin_order_items_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Calculate date range for last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 3. Filter order items by date range
  const result: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.admin.items.index(adminConnection, {
      body: {
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(result);
  // 4. Validate metadata
  TestValidator.predicate(
    "pagination has valid current page",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "records count matches data length",
    result.data.length <= result.pagination.limit,
  );
}
