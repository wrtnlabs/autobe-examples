import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate that admin can search order shipments with various filters and that
 * only authorized admin accounts can retrieve shipment data.
 *
 * 1. Register a new admin account.
 * 2. Generate a mock order number for shipment search (since order creation is not
 *    available in accessible SDK functions).
 * 3. Attempt to retrieve shipments while authenticated, using shipment filter
 *    fields.
 * 4. Validate shipments, pagination, and that field filters (status,
 *    tracking_number, shipping_partner_id, date ranges) work logically.
 * 5. Attempt shipment search with deliberate mismatched filter (e.g., bad status
 *    or random tracking number), assert empty result.
 * 6. Switch to unauthenticated connection and assert shipment search is forbidden.
 */
export async function test_api_order_shipments_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (establish authentication)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12) + ".Aa1!";
  const adminName: string = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  // 2. Generate a plausible order number and shipment filter values
  const orderNumber: string =
    "ORD" +
    typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString();
  // 3. Search shipments by admin (all filters left undefined, get all shipments for this order number)
  const response: IPageIShoppingMallOrderShipment.ISummary =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderNumber,
      body: {},
    });
  typia.assert(response);
  TestValidator.equals(
    "pagination.current defaults to 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is sensible",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  // 4. If there's any shipment in the result, run filtered queries on each
  if (response.data.length > 0) {
    const sample = RandomGenerator.pick(response.data);
    // Filter by status
    const statusFiltered =
      await api.functional.shoppingMall.admin.orders.shipments.index(
        connection,
        {
          orderNumber,
          body: { status: sample.status },
        },
      );
    typia.assert(statusFiltered);
    TestValidator.predicate(
      "all shipments match status filter",
      statusFiltered.data.every((s) => s.status === sample.status),
    );
    // Filter by tracking_number
    const numberFiltered =
      await api.functional.shoppingMall.admin.orders.shipments.index(
        connection,
        {
          orderNumber,
          body: { tracking_number: sample.tracking_number },
        },
      );
    typia.assert(numberFiltered);
    TestValidator.predicate(
      "all shipments match tracking_number filter",
      numberFiltered.data.every(
        (s) => s.tracking_number === sample.tracking_number,
      ),
    );
    // Filter by shipping_partner_id
    const partnerFiltered =
      await api.functional.shoppingMall.admin.orders.shipments.index(
        connection,
        {
          orderNumber,
          body: { shipping_partner_id: sample.shipping_partner.id },
        },
      );
    typia.assert(partnerFiltered);
    TestValidator.predicate(
      "all shipments match shipping_partner_id filter",
      partnerFiltered.data.every(
        (s) => s.shipping_partner.id === sample.shipping_partner.id,
      ),
    );
    // Filter by date range
    const createdAt = sample.created_at;
    const dateFiltered =
      await api.functional.shoppingMall.admin.orders.shipments.index(
        connection,
        {
          orderNumber,
          body: { start_created_at: createdAt, end_created_at: createdAt },
        },
      );
    typia.assert(dateFiltered);
    TestValidator.predicate(
      "all shipments created exactly at the filtered date",
      dateFiltered.data.every((s) => s.created_at === createdAt),
    );
    // Paginate with limit=1
    const paged =
      await api.functional.shoppingMall.admin.orders.shipments.index(
        connection,
        {
          orderNumber,
          body: { limit: 1 },
        },
      );
    typia.assert(paged);
    TestValidator.equals("page has only 1 item", paged.data.length, 1);
    TestValidator.equals(
      "pagination.limit matches query",
      paged.pagination.limit,
      1,
    );
  }
  // 5. Search with filters that should yield 0 results
  const emptyStatus = "nonexistent-status-test";
  const emptyStatusResp =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderNumber,
      body: { status: emptyStatus },
    });
  typia.assert(emptyStatusResp);
  TestValidator.equals(
    "no shipment for unknown status",
    emptyStatusResp.data.length,
    0,
  );
  // 6. Attempt access with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbid access without admin authentication",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.index(
        unauthConn,
        {
          orderNumber,
          body: {},
        },
      );
    },
  );
}
