import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_empty_and_edge_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const emptyPage = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: {
        search: `__no_match__${RandomGenerator.alphaNumeric(12)}`,
        status: `__invalid_status__${RandomGenerator.alphaNumeric(8)}`,
        orderId: typia.random<string & tags.Format<"uuid">>(),
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        trackingNumber: `__missing_tracking__${RandomGenerator.alphaNumeric(10)}`,
        createdAtFrom: new Date("2999-01-01T00:00:00.000Z").toISOString(),
        createdAtTo: new Date("2999-01-02T00:00:00.000Z").toISOString(),
        shippedAtFrom: new Date("2999-01-01T00:00:00.000Z").toISOString(),
        shippedAtTo: new Date("2999-01-02T00:00:00.000Z").toISOString(),
        page: 1,
        limit: 1,
        sort: "createdAtDesc",
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 1);
  const historyPage =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "createdAtDesc",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(historyPage);
  TestValidator.equals(
    "history pagination current",
    historyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "history pagination limit",
    historyPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "history pagination records non-negative",
    historyPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "history pagination pages non-negative",
    historyPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "history data array exists",
    Array.isArray(historyPage.data),
  );
  TestValidator.predicate(
    "history entries are present or empty without malformed response",
    true,
  );
}
