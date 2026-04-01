import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller shipment list pagination functionality.
 *
 * This test verifies that sellers can retrieve their shipment list with proper
 * pagination support. It tests:
 * 1. Seller authentication and shipment creation
 * 2. Pagination metadata accuracy (current, limit, records, pages)
 * 3. Shipment summary completeness (all required fields present)
 * 4. Sort order verification (descending by shippedAt)
 * 5. Seller isolation (only authenticated seller's shipments returned)
 * 6. Multi-page navigation (page 1 and page 2)
 */
export async function test_api_seller_shipment_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create multiple shipments (15 items to test pagination with limit 10)
  const shipmentCount = 15;
  await ArrayUtil.asyncRepeat(shipmentCount, async () => {
    return await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          tracking_carrier: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "USPS",
          ]),
          tracking_number: RandomGenerator.alphaNumeric(12),
          order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  });
  // 3. Get first page of shipments (default pagination)
  const page1Response =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(page1Response);
  // 4. Verify pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    shipmentCount,
  );
  TestValidator.equals("page 1 total pages", page1Response.pagination.pages, 2);
  // 5. Verify page 1 data length
  TestValidator.predicate(
    "page 1 has 10 items",
    page1Response.data.length === 10,
  );
  // 6. Verify each shipment summary has required fields and belongs to seller
  for (const shipment of page1Response.data) {
    typia.assert(shipment);
    TestValidator.equals(
      "shipment seller matches auth",
      shipment.seller.id,
      sellerAuth.id,
    );
  }
  // 7. Verify sort order (descending by shippedAt)
  for (let i = 1; i < page1Response.data.length; i++) {
    const prevTime = new Date(page1Response.data[i - 1].shippedAt).getTime();
    const currTime = new Date(page1Response.data[i].shippedAt).getTime();
    TestValidator.predicate(
      `page 1: shipment ${i - 1} shippedAt >= shipment ${i} shippedAt (descending order)`,
      prevTime >= currTime,
    );
  }
  // 8. Get second page of shipments
  const page2Response =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(page2Response);
  // 9. Verify pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records",
    page2Response.pagination.records,
    shipmentCount,
  );
  TestValidator.equals("page 2 total pages", page2Response.pagination.pages, 2);
  // 10. Verify page 2 data length (remaining 5 items)
  TestValidator.equals("page 2 has 5 items", page2Response.data.length, 5);
  // 11. Verify page 2 shipments are different from page 1
  const page1Ids = page1Response.data.map((s) => s.id);
  const page2Ids = page2Response.data.map((s) => s.id);
  for (const id of page2Ids) {
    TestValidator.predicate(
      "page 2 shipment not in page 1",
      !page1Ids.includes(id),
    );
  }
  // 12. Verify all page 2 shipments belong to the same seller
  for (const shipment of page2Response.data) {
    typia.assert(shipment);
    TestValidator.equals(
      "page 2 seller matches auth",
      shipment.seller.id,
      sellerAuth.id,
    );
  }
  // 13. Verify sort order continues on page 2
  for (let i = 1; i < page2Response.data.length; i++) {
    const prevTime = new Date(page2Response.data[i - 1].shippedAt).getTime();
    const currTime = new Date(page2Response.data[i].shippedAt).getTime();
    TestValidator.predicate(
      `page 2: shipment ${i - 1} shippedAt >= shipment ${i} shippedAt (descending order)`,
      prevTime >= currTime,
    );
  }
}
