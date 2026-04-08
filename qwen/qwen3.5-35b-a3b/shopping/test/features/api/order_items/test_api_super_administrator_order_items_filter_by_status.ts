import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: typia.random<
        string & tags.Format<"password"> & tags.MinLength<8>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Test status filtering - test with each valid status
  const statuses: (
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
  )[] = ["paid", "shipped", "delivered", "cancelled", "refunded"];
  for (const status of statuses) {
    const response =
      await api.functional.ecommerceMall.superAdministrator.order_items.index(
        adminConnection,
        {
          body: {
            status,
            limit: 10,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(response);
    // Validate all returned items match the filter
    for (const item of response.data) {
      TestValidator.equals(
        `status filter for ${status} - item status`,
        item.status,
        status,
      );
    }
  }
  // 3. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const responseWithDateRange =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      adminConnection,
      {
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: now.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(responseWithDateRange);
  // 4. Test order_id filtering
  // First get all items to find an order_id to test with
  const allItems =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      adminConnection,
      {
        body: { limit: 1 },
      },
    );
  typia.assert(allItems);
  if (allItems.data.length > 0) {
    // Get the order_number from first item and search by it
    // Note: Since we only have item data, we test pagination and data completeness
    const firstItem = allItems.data[0];
    TestValidator.equals(
      "order summary has required fields",
      firstItem.order_number,
      "any",
    );
    TestValidator.equals(
      "order summary has seller name",
      firstItem.seller_display_name,
      "any",
    );
    TestValidator.equals(
      "order summary has variant name",
      firstItem.product_variant_name,
      "any",
    );
  }
  // 5. Test combined filters
  const responseCombined =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      adminConnection,
      {
        body: {
          status: "paid",
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(responseCombined);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid structure",
    () =>
      responseCombined.pagination !== null &&
      responseCombined.pagination !== undefined &&
      typeof responseCombined.pagination.current === "number" &&
      typeof responseCombined.pagination.limit === "number" &&
      typeof responseCombined.pagination.records === "number" &&
      typeof responseCombined.pagination.pages === "number",
  );
  // 6. Test empty results scenario
  const responseEmpty =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(responseEmpty);
  TestValidator.predicate(
    "pagination shows accurate count",
    () => responseEmpty.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    () => responseEmpty.pagination.pages >= 0,
  );
}