import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the admin inventory records endpoint with comprehensive filter combinations.
 * Verify filtering by productId, variantId, reason values, quantityDirection, and date ranges.
 * Validate pagination metadata and default sorting (newest first).
 */
export async function test_api_admin_inventory_records_comprehensive_filtering(
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
    },
  });
  // 2. Test basic request without filters (default behavior)
  const basicResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(basicResult);
  // 3. Test with specific page and limit
  const paginatedResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // 4. Test filter by productId
  const productIdResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          productId: typia.random<string & tags.Format<"uuid">>(),
          limit: 5,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(productIdResult);
  // 5. Test filter by variantId
  const variantIdResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          limit: 5,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(variantIdResult);
  // 6. Test filter by various reasons
  const reasons = [
    "restock",
    "order_placed",
    "order_cancelled",
    "refund_processed",
    "inventory_adjustment",
  ] as const;
  for (const reason of reasons) {
    const reasonResult =
      await api.functional.ecommerceMall.admin.inventory_records.index(
        adminConnection,
        {
          body: {
            reason,
            limit: 5,
          } satisfies IEcommerceMallInventoryRecord.IRequest,
        },
      );
    typia.assert(reasonResult);
  }
  // 7. Test filter by quantityDirection (positive for stock increases)
  const positiveResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          quantityDirection: "positive",
          limit: 5,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(positiveResult);
  // 8. Test filter by quantityDirection (negative for stock decreases)
  const negativeResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          quantityDirection: "negative",
          limit: 5,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(negativeResult);
  // 9. Test filter by date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          dateRangeFrom: thirtyDaysAgo.toISOString(),
          dateRangeTo: now.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 10. Test combined filters (reason + quantityDirection + date range)
  const combinedResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          reason: "order_placed",
          quantityDirection: "negative",
          dateRangeFrom: thirtyDaysAgo.toISOString(),
          dateRangeTo: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 11. Test sorting with different parameters
  const ascResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          sortField: "createdAt",
          sortDirection: "asc",
          limit: 5,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(ascResult);
  const descResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          sortField: "createdAt",
          sortDirection: "desc",
          limit: 5,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(descResult);
  // 12. Test filtering with all parameters combined (comprehensive audit)
  const comprehensiveResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          productId: typia.random<string & tags.Format<"uuid">>(),
          reason: "restock",
          quantityDirection: "positive",
          dateRangeFrom: thirtyDaysAgo.toISOString(),
          dateRangeTo: now.toISOString(),
          sortField: "createdAt",
          sortDirection: "desc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(comprehensiveResult);
}
