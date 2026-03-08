import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller pending shipments endpoint with empty queue scenario.
 *
 * This test validates that when a newly registered seller queries the pending
 * shipments endpoint, they receive an empty response with correct pagination
 * metadata showing 0 records and 0 pages. This edge case ensures the endpoint
 * properly handles the scenario where no order items are awaiting shipment.
 *
 * Test flow:
 * 1. Register a new seller account
 * 2. Query pending shipments endpoint with default pagination
 * 3. Validate response contains empty data array
 * 4. Validate pagination metadata shows 0 records and 0 pages
 */
export async function test_api_seller_pending_shipments_empty_queue(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Query pending shipments endpoint (seller has no orders yet)
  const pendingShipments =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(pendingShipments);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", pendingShipments.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    pendingShipments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    pendingShipments.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages",
    pendingShipments.pagination.pages,
    0,
  );
}
