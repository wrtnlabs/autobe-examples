import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering shipments by specific seller and order for targeted oversight and dispute resolution.
 *
 * Validates the complete shipment filtering workflow including administrator authentication, seller-based filtering, order-based filtering, and combined filter scenarios. Ensures that the filtering logic correctly returns only shipments matching the specified criteria.
 *
 * Special attention is given to verifying that seller filters return only shipments from that seller, order filters return all shipments for that order (which may be multiple if items from different sellers), and combined filters work with AND logic.
 *
 * 1. Administrator registers and authenticates via /shoppingMall/auth/admin/join.
 * 2. Administrator calls PATCH /shoppingMall/admin/admin/shipments with seller_id filter.
 * 3. Verify all returned shipments belong to the specified seller.
 * 4. Administrator calls PATCH /shoppingMall/admin/admin/shipments with order_id filter.
 * 5. Verify all returned shipments belong to the specified order.
 * 6. Administrator calls PATCH /shoppingMall/admin/admin/shipments with both seller_id and order_id filters.
 * 7. Verify results match both criteria and pagination metadata reflects filtered counts.
 */
export async function test_api_admin_shipment_filter_by_seller_and_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test seller_id filter
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerFilterResult =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          seller_id: sellerId,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(sellerFilterResult);
  // Validate all shipments belong to specified seller
  for (const shipment of sellerFilterResult.data) {
    TestValidator.equals(
      "shipment seller matches filter",
      shipment.seller.id,
      sellerId,
    );
  }
  // 3. Test order_id filter
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderFilterResult =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          order_id: orderId,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(orderFilterResult);
  // Validate all shipments belong to specified order
  for (const shipment of orderFilterResult.data) {
    TestValidator.equals(
      "shipment order matches filter",
      shipment.order.id,
      orderId,
    );
  }
  // 4. Test combined seller_id and order_id filter
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          seller_id: sellerId,
          order_id: orderId,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Validate all shipments match both criteria
  for (const shipment of combinedFilterResult.data) {
    TestValidator.equals(
      "shipment seller matches combined filter",
      shipment.seller.id,
      sellerId,
    );
    TestValidator.equals(
      "shipment order matches combined filter",
      shipment.order.id,
      orderId,
    );
  }
  // 5. Validate pagination metadata relationships
  TestValidator.predicate(
    "pagination current page valid",
    sellerFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    sellerFilterResult.pagination.limit >= 1 &&
      sellerFilterResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    sellerFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sellerFilterResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation correct",
    sellerFilterResult.pagination.pages ===
      Math.ceil(
        sellerFilterResult.pagination.records /
          sellerFilterResult.pagination.limit,
      ),
  );
  // 6. Test partial match search on carrier_name
  const carrierSearchResult =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          carrier_name: "FedEx",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(carrierSearchResult);
  // Validate carrier name contains search term (partial match)
  for (const shipment of carrierSearchResult.data) {
    TestValidator.predicate(
      "carrier name contains search term",
      shipment.carrier_name.toLowerCase().includes("fedex".toLowerCase()),
    );
  }
  // 7. Test partial match search on tracking_number
  const trackingSearchResult =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          tracking_number: "1Z",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(trackingSearchResult);
  // Validate tracking number contains search term (partial match)
  for (const shipment of trackingSearchResult.data) {
    TestValidator.predicate(
      "tracking number contains search term",
      shipment.tracking_number.toLowerCase().includes("1z".toLowerCase()),
    );
  }
}
