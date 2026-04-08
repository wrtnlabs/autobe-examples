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
 * Test administrator filtering shipments by delivery status to distinguish between delivered and in-transit shipments.
 *
 * Validates the complete delivery status filtering workflow including administrator authentication, filtering by delivered status (is_delivered=true), and filtering by in-transit status (is_delivered=false). Ensures that the filtering correctly separates shipments based on their delivered_at timestamp.
 *
 * Special attention is given to verifying that when is_delivered=true, all returned shipments have a non-null delivered_at timestamp, and when is_delivered=false, all returned shipments have delivered_at as null.
 *
 * 1. Administrator authenticates via /shoppingMall/auth/admin/join.
 * 2. Administrator calls PATCH /shoppingMall/admin/admin/shipments with is_delivered: true.
 * 3. Validates all returned shipments have delivered_at set to a valid timestamp.
 * 4. Administrator calls PATCH /shoppingMall/admin/admin/shipments with is_delivered: false.
 * 5. Validates all returned shipments have delivered_at as null (in-transit).
 * 6. Verifies pagination metadata correctly reflects filtered result counts.
 */
export async function test_api_admin_shipment_filter_by_delivery_status(
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
  // 2. Filter by delivered shipments (is_delivered: true)
  const deliveredFilter: IShoppingMallShipment.IRequest = {
    is_delivered: true,
    page: 1,
    limit: 20,
  };
  const deliveredResult =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: deliveredFilter,
      },
    );
  typia.assert(deliveredResult);
  // 3. Validate all delivered shipments have non-null delivered_at
  TestValidator.predicate("delivered shipments have delivered_at", () =>
    deliveredResult.data.every((shipment) => shipment.delivered_at !== null),
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    deliveredResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    deliveredResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records match data length",
    deliveredResult.pagination.records >= deliveredResult.data.length,
  );
  // 4. Filter by in-transit shipments (is_delivered: false)
  const inTransitFilter: IShoppingMallShipment.IRequest = {
    is_delivered: false,
    page: 1,
    limit: 20,
  };
  const inTransitResult =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: inTransitFilter,
      },
    );
  typia.assert(inTransitResult);
  // 5. Validate all in-transit shipments have null delivered_at
  TestValidator.predicate("in-transit shipments have null delivered_at", () =>
    inTransitResult.data.every((shipment) => shipment.delivered_at === null),
  );
  // Validate pagination metadata for in-transit
  TestValidator.predicate(
    "in-transit pagination current page is 1",
    inTransitResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "in-transit pagination limit is 20",
    inTransitResult.pagination.limit === 20,
  );
  // 6. Test without delivery status filter (should return both types)
  const allShipmentsFilter: IShoppingMallShipment.IRequest = {
    page: 1,
    limit: 20,
  };
  const allShipmentsResult =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: allShipmentsFilter,
      },
    );
  typia.assert(allShipmentsResult);
  // Validate that unfiltered results contain at least as many records as filtered
  TestValidator.predicate(
    "unfiltered count >= delivered count",
    allShipmentsResult.pagination.records >= deliveredResult.pagination.records,
  );
  TestValidator.predicate(
    "unfiltered count >= in-transit count",
    allShipmentsResult.pagination.records >= inTransitResult.pagination.records,
  );
}
