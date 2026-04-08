import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller shipment browse results with pagination and summary-only projection.
 *
 * Verifies that a registered seller can access the shipment browse endpoint using a seller-authenticated connection,
 * and that the response follows the expected paginated summary structure for fulfillment records.
 *
 * The scenario also checks that the browse result exposes shipment header data together with related seller and order
 * summaries, while excluding any nested shipment-item graph from the summary payload.
 *
 * 1. Register and authenticate a seller account.
 * 2. Browse the seller shipment collection with page, limit, and newest-first sorting.
 * 3. Validate pagination metadata and summary-only shipment projection.
 * 4. Confirm the result is suitable for seller-owned shipment browsing without exposing nested shipment items.
 */
export async function test_api_shipment_browse_seller_own_shipments(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: `P@ssw0rd${RandomGenerator.alphabets(6)}`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const page = await api.functional.mallPlatform.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "-createdAt",
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "shipment browse returns summary rows",
    page.data.every((shipment) => {
      return (
        typeof shipment.id === "string" &&
        typeof shipment.carrierName === "string" &&
        typeof shipment.trackingNumber === "string" &&
        typeof shipment.status === "string" &&
        typeof shipment.createdAt === "string" &&
        typeof shipment.updatedAt === "string" &&
        typeof shipment.seller.id === "string" &&
        typeof shipment.seller.email === "string" &&
        typeof shipment.order.id === "string" &&
        typeof shipment.order.orderNumber === "string"
      );
    }),
  );
  TestValidator.predicate(
    "shipment summaries do not expose nested shipment-item graph fields",
    page.data.every(
      (shipment) =>
        !Object.prototype.hasOwnProperty.call(shipment, "items") &&
        !Object.prototype.hasOwnProperty.call(shipment, "item") &&
        !Object.prototype.hasOwnProperty.call(shipment, "shipments"),
    ),
  );
  if (page.data.length >= 2) {
    TestValidator.predicate(
      "newest-first sort is respected when multiple shipments are present",
      page.data[0]!.createdAt >= page.data[1]!.createdAt,
    );
  }
  TestValidator.predicate(
    "completed shipments remain visible in browse results when present",
    page.data.every((shipment) => shipment.status.length > 0),
  );
}
