import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve first page of shipments (page=1, limit=3)
  const pageSize = 3;
  const page1 = await api.functional.ecommerceMall.customer.shipments.index(
    customerConnection,
    {
      body: {
        orderId: null,
        sellerId: null,
        carrierName: null,
        status: null,
        shippedAtFrom: null,
        shippedAtTo: null,
        page: 1,
        limit: pageSize,
        search: null,
        sort: null,
        order: null,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Validate first page response
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1.data.length <= pageSize,
  );
  // 4. Retrieve second page of shipments (page=2, limit=3)
  const page2 = await api.functional.ecommerceMall.customer.shipments.index(
    customerConnection,
    {
      body: {
        orderId: null,
        sellerId: null,
        carrierName: null,
        status: null,
        shippedAtFrom: null,
        shippedAtTo: null,
        page: 2,
        limit: pageSize,
        search: null,
        sort: null,
        order: null,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(page2);
  // 5. Validate second page response
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.predicate(
    "page 2 data length <= limit",
    page2.data.length <= pageSize,
  );
  // 6. Verify total records consistency
  TestValidator.equals(
    "total records consistent across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  // 7. Verify no duplicate shipments across pages
  const page1Ids = new Set(page1.data.map((s) => s.id));
  const page2Ids = new Set(page2.data.map((s) => s.id));
  const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
  TestValidator.equals(
    "no duplicate shipments across pages",
    intersection.length,
    0,
  );
  // 8. Test page beyond available data (should return empty data)
  const beyondPage = page1.pagination.pages + 1;
  const emptyPage = await api.functional.ecommerceMall.customer.shipments.index(
    customerConnection,
    {
      body: {
        orderId: null,
        sellerId: null,
        carrierName: null,
        status: null,
        shippedAtFrom: null,
        shippedAtTo: null,
        page: beyondPage,
        limit: pageSize,
        search: null,
        sort: null,
        order: null,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(emptyPage);
  // 9. Validate empty page response
  TestValidator.equals(
    "empty page current",
    emptyPage.pagination.current,
    beyondPage,
  );
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
}
