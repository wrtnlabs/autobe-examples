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
 * Test seller shipment needs shipping endpoint with empty list (no paid items).
 *
 * This test validates that when a seller has no order items with 'paid' status,
 * the needs-shipping endpoint correctly returns an empty data array with proper
 * pagination metadata showing 0 total records and 0 pages.
 *
 * Test flow:
 * 1. Register a new seller account
 * 2. Authenticate the seller
 * 3. Call the needs-shipping endpoint
 * 4. Validate empty response with correct pagination metadata
 */
export async function test_api_shipment_needs_shipping_empty_list_no_paid_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerJoinOutput = await authorize_seller_join(connection, {
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
  typia.assert(sellerJoinOutput);
  // 2. Create seller-specific connection with authentication token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: sellerJoinOutput.token.access,
  };
  // 3. Call the needs-shipping endpoint (seller has no orders yet, so no paid items)
  const result =
    await api.functional.ecommerceMall.seller.shipments.needs_shipping.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate empty data array
  TestValidator.equals("data array is empty", result.data.length, 0);
  // 5. Validate pagination metadata shows 0 records and 0 pages
  TestValidator.equals("pagination records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", result.pagination.pages, 0);
  TestValidator.predicate(
    "pagination current is valid",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    result.pagination.limit >= 0,
  );
}
