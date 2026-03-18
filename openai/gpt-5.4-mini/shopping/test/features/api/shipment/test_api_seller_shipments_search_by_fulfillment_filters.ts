import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipments_search_by_fulfillment_filters(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallSeller.IJoin,
  });
  const baseRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallShipment.IRequest;
  const broad = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: baseRequest,
    },
  );
  typia.assert(broad);
  TestValidator.equals(
    "pagination limit follows request",
    broad.pagination.limit,
    baseRequest.limit,
  );
  TestValidator.equals(
    "pagination current page follows request",
    broad.pagination.current,
    baseRequest.page,
  );
  TestValidator.predicate(
    "broad shipment list is paginated",
    broad.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "broad shipment list records are non-negative",
    broad.pagination.records >= 0,
  );
  TestValidator.predicate(
    "broad shipment list only includes authenticated seller scope",
    broad.data.every((shipment) => shipment.seller.id === seller.id),
  );
  const statusCandidates = Array.from(
    new Set(
      broad.data
        .map((shipment) => shipment.status)
        .filter((status) => !!status),
    ),
  );
  if (statusCandidates.length > 0) {
    const status = statusCandidates[0]!;
    const filtered = await api.functional.shoppingMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          ...baseRequest,
          status,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
    typia.assert(filtered);
    TestValidator.predicate(
      "status-filtered shipment list only includes requested status",
      filtered.data.every((shipment) => shipment.status === status),
    );
    TestValidator.predicate(
      "status-filtered shipment list remains seller scoped",
      filtered.data.every((shipment) => shipment.seller.id === seller.id),
    );
  }
  const carrierCandidates = Array.from(
    new Set(
      broad.data
        .map((shipment) => shipment.carrierName)
        .filter((carrierName) => carrierName.length > 0),
    ),
  );
  if (carrierCandidates.length > 0) {
    const carrierName = carrierCandidates[0]!;
    const filtered = await api.functional.shoppingMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          ...baseRequest,
          carrier_name: carrierName,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
    typia.assert(filtered);
    TestValidator.predicate(
      "carrier-filtered shipment list only includes requested carrier",
      filtered.data.every((shipment) => shipment.carrierName === carrierName),
    );
    TestValidator.predicate(
      "carrier-filtered shipment list remains seller scoped",
      filtered.data.every((shipment) => shipment.seller.id === seller.id),
    );
  }
  if (broad.data.length > 0) {
    const first = broad.data[0]!;
    const byOrder = await api.functional.shoppingMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          ...baseRequest,
          shopping_mall_order_id: first.order.id,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
    typia.assert(byOrder);
    TestValidator.predicate(
      "order-filtered shipment list only includes requested order",
      byOrder.data.every((shipment) => shipment.order.id === first.order.id),
    );
    TestValidator.predicate(
      "order-filtered shipment list remains seller scoped",
      byOrder.data.every((shipment) => shipment.seller.id === seller.id),
    );
  }
}
