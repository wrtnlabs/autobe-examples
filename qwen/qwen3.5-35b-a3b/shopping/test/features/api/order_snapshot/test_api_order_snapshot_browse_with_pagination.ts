import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_order_snapshot_browse_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(adminAuth);
  // 2. Browse order snapshots with default pagination
  const page1Response: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(page1Response);
  // 3. Validate pagination structure
  TestValidator.equals("page1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page1 limit", page1Response.pagination.limit, 20);
  TestValidator.predicate(
    "page1 records non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.equals(
    "page1 pages",
    page1Response.pagination.pages,
    page1Response.pagination.records > 0
      ? Math.ceil(page1Response.pagination.records / 20)
      : 0,
  );
  // 4. Validate each snapshot has required fields
  const snapshotFields = [
    "id",
    "order_number",
    "order_date",
    "customer_name",
    "customer_phone",
    "shipping_recipient_name",
    "shipping_phone",
    "shipping_street",
    "shipping_city",
    "shipping_state",
    "shipping_postal_code",
    "shipping_country",
    "item_count",
    "subtotal",
    "shipping_fee",
    "total_amount",
    "order_status",
  ] as const;
  for (const snapshot of page1Response.data) {
    for (const field of snapshotFields) {
      TestValidator.predicate(
        `snapshot has ${field}`,
        snapshot[field] !== undefined && snapshot[field] !== null,
      );
    }
  }
  // 5. Test pagination navigation to page 2
  const page2Response: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 20,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page2 current", page2Response.pagination.current, 2);
  // 6. Test different limit
  const customLimit = 50;
  const customLimitResponse: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: customLimit,
        },
      },
    );
  typia.assert(customLimitResponse);
  TestValidator.equals(
    "custom limit",
    customLimitResponse.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data count <= limit",
    customLimitResponse.data.length <= customLimit,
  );
  // 7. Test search with non-existent order number
  const searchResponse: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.index(
      adminConnection,
      {
        body: {
          search: "NON_EXISTENT_ORDER_NUMBER_12345",
        },
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals("search empty result", searchResponse.data.length, 0);
}
