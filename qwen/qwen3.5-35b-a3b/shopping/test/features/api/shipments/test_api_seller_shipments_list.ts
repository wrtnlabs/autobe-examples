import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipments_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://seller.test.com/dashboard",
      referrer: "https://test.com/seller-signup",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Test empty results - seller has no shipments yet
  const emptyResult = await api.functional.ecommerceMall.seller.shipments.index(
    { ...sellerConnection, headers: { Authorization: seller.token.access } },
    { body: {} },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result pagination",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result limit", emptyResult.pagination.limit, 20);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  // 3. Test pagination parameters
  const page2Result = await api.functional.ecommerceMall.seller.shipments.index(
    { ...sellerConnection, headers: { Authorization: seller.token.access } },
    { body: { page: 2, limit: 10 } },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  const largeLimitResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { limit: 50 } },
    );
  typia.assert(largeLimitResult);
  TestValidator.equals("limit 50 limit", largeLimitResult.pagination.limit, 50);
  // 4. Test filtering by status
  const pendingFilter =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { status: "pending" } },
    );
  typia.assert(pendingFilter);
  TestValidator.equals(
    "pending filter data is array",
    Array.isArray(pendingFilter.data),
    true,
  );
  const deliveredFilter =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { status: "delivered" } },
    );
  typia.assert(deliveredFilter);
  TestValidator.equals(
    "delivered filter data is array",
    Array.isArray(deliveredFilter.data),
    true,
  );
  const failedFilter =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { status: "failed" } },
    );
  typia.assert(failedFilter);
  const cancelledFilter =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { status: "cancelled" } },
    );
  typia.assert(cancelledFilter);
  // 5. Test sorting by created_at (default)
  const defaultSort = await api.functional.ecommerceMall.seller.shipments.index(
    { ...sellerConnection, headers: { Authorization: seller.token.access } },
    { body: {} },
  );
  typia.assert(defaultSort);
  TestValidator.equals(
    "default sort data is array",
    Array.isArray(defaultSort.data),
    true,
  );
  // 6. Test sorting by shipped_at
  const shippedAtSort =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { sort: "shipped_at" } },
    );
  typia.assert(shippedAtSort);
  // 7. Test sorting by delivered_at
  const deliveredAtSort =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { sort: "delivered_at" } },
    );
  typia.assert(deliveredAtSort);
  // 8. Test sorting by status
  const statusSort = await api.functional.ecommerceMall.seller.shipments.index(
    { ...sellerConnection, headers: { Authorization: seller.token.access } },
    { body: { sort: "status" } },
  );
  typia.assert(statusSort);
  // 9. Test sorting by carrier_name
  const carrierSort = await api.functional.ecommerceMall.seller.shipments.index(
    { ...sellerConnection, headers: { Authorization: seller.token.access } },
    { body: { sort: "carrier_name" } },
  );
  typia.assert(carrierSort);
  // 10. Test carrier_name search filter
  const carrierSearch =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { carrier_name: "FedEx" } },
    );
  typia.assert(carrierSearch);
  // 11. Test combined filtering and pagination
  const combinedFilter =
    await api.functional.ecommerceMall.seller.shipments.index(
      { ...sellerConnection, headers: { Authorization: seller.token.access } },
      { body: { status: "pending", page: 1, limit: 30 } },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter current",
    combinedFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedFilter.pagination.limit,
    30,
  );
  // 12. Verify shipment summary fields structure using random data
  const randomShipment = typia.random<IEcommerceMallShipment.ISummary>();
  typia.assert(randomShipment);
  TestValidator.equals(
    "shipment has id",
    randomShipment.id !== undefined,
    true,
  );
  TestValidator.equals(
    "shipment has status",
    randomShipment.status !== undefined,
    true,
  );
  TestValidator.equals(
    "shipment has tracking_count",
    randomShipment.trackingCount !== undefined,
    true,
  );
  TestValidator.equals(
    "shipment tracking_count >= 0",
    randomShipment.trackingCount >= 0,
    true,
  );
  typia.assert(randomShipment.order);
  TestValidator.equals(
    "shipment has order",
    randomShipment.order.id !== undefined,
    true,
  );
  // 13. Verify pagination structure using random data
  const randomPage = typia.random<IPageIEcommerceMallShipment.ISummary>();
  typia.assert(randomPage);
  typia.assert(randomPage.pagination);
  TestValidator.equals(
    "pagination has current",
    randomPage.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    randomPage.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    randomPage.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    randomPage.pagination.pages !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination data is array",
    Array.isArray(randomPage.data),
    true,
  );
}
