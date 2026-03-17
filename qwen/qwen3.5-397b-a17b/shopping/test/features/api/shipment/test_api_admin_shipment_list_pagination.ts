import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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
 * Test administrator shipment list pagination functionality.
 *
 * This test verifies that an administrator can retrieve a paginated list of all
 * shipments across the platform. The test validates:
 * 1. Admin authentication works correctly
 * 2. Response includes proper pagination metadata
 * 3. Each shipment contains all required fields
 * 4. Shipments are sorted by creation date descending (newest first)
 * 5. Default pagination parameters work correctly (page=1, limit=20)
 */
export async function test_api_admin_shipment_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@${RandomGenerator.alphabets(5)}.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphabets(8)}.com`,
      referrer: `https://${RandomGenerator.alphabets(8)}.com`,
      ip: `192.168.${randint(0, 255)}.${randint(1, 254)}`,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve shipment list with default pagination
  const shipments = await api.functional.shoppingMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(shipments);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    () => shipments.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    () => shipments.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => shipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => shipments.pagination.pages >= 0,
  );
  // 4. Validate shipments data array exists
  TestValidator.predicate("shipments data is array", () =>
    Array.isArray(shipments.data),
  );
  // 5. Validate each shipment has order summary
  if (shipments.data.length > 0) {
    for (const shipment of shipments.data) {
      // Validate order summary exists
      TestValidator.predicate(
        "order summary exists",
        () => shipment.order !== null && shipment.order !== undefined,
      );
    }
    // 6. Validate sorting (newest first by created_at)
    if (shipments.data.length > 1) {
      for (let i = 0; i < shipments.data.length - 1; i++) {
        const current = new Date(shipments.data[i].created_at).getTime();
        const next = new Date(shipments.data[i + 1].created_at).getTime();
        TestValidator.predicate(
          `shipment ${i} is newer than or equal to shipment ${i + 1}`,
          () => current >= next,
        );
      }
    }
  }
}