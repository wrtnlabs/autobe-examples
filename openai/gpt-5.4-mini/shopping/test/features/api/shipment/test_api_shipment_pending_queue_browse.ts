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
 * Test seller pending shipment queue browsing with paginated summary data.
 *
 * This test verifies that an authenticated seller can query the pending shipment queue and receive a paginated shipment summary page. It focuses on the browse contract: pagination metadata, shipment header fields, and the related seller and order summaries that are exposed for queue processing.
 *
 * The scenario also confirms that the returned records represent actionable pending shipments rather than completed fulfillment records. Item-level shipment composition is intentionally not asserted because this endpoint is a summary browse operation.
 *
 * 1. Register a seller account and create an authenticated seller connection.
 * 2. Call the pending shipment queue endpoint with realistic pagination and sorting criteria.
 * 3. Validate the response page metadata and shipment summary relationships.
 * 4. Confirm that completed shipment states are not included in the queue results.
 */
export async function test_api_shipment_pending_queue_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const request = {
    page: 1,
    limit: 10,
    sort: "-createdAt",
    status: "pending",
  } satisfies IMallPlatformShipment.IRequest;
  const page = await api.functional.mallPlatform.seller.shipments.pending.index(
    sellerConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination statistics are non-negative",
    page.pagination.records >= 0 && page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "shipment page data is an array",
    Array.isArray(page.data),
  );
  for (const shipment of page.data) {
    TestValidator.predicate("shipment has an id", shipment.id.length > 0);
    TestValidator.predicate(
      "shipment exposes seller summary fields",
      shipment.seller.id.length > 0 &&
        shipment.seller.email.length > 0 &&
        shipment.seller.status.length > 0,
    );
    TestValidator.predicate(
      "shipment exposes order summary fields",
      shipment.order.id.length > 0 &&
        shipment.order.orderNumber.length > 0 &&
        shipment.order.status.length > 0,
    );
    TestValidator.predicate(
      "shipment has carrier and tracking fields",
      shipment.carrierName.length > 0 && shipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment summary is not a completed shipment",
      shipment.status !== "delivered" && shipment.status !== "cancelled",
    );
  }
}
