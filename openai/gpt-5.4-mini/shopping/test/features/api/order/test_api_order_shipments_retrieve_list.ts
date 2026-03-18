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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_shipments_retrieve_list(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page should reflect request page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should reflect request limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination metadata should be non-negative",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size should not exceed requested limit",
    response.data.length <= response.pagination.limit,
  );
  TestValidator.predicate(
    "total pages should be consistent with record count",
    response.pagination.limit === 0
      ? response.pagination.pages === 0
      : response.pagination.pages >=
          Math.ceil(response.pagination.records / response.pagination.limit),
  );
  for (const shipment of response.data) {
    typia.assert(shipment);
    TestValidator.equals(
      "shipment should belong to the requested order",
      shipment.order.id,
      response.data[0]?.order.id ?? shipment.order.id,
    );
    TestValidator.predicate(
      "shipment should include seller context",
      shipment.seller.id.length > 0 &&
        shipment.seller.sellerProfile.id.length > 0,
    );
    TestValidator.predicate(
      "shipment should include carrier and tracking details",
      shipment.carrierName.length > 0 && shipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment should include lifecycle timestamps",
      shipment.createdAt.length > 0 && shipment.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "shipment shipped timestamp should be present when status is shipped or later",
      shipment.status === "shipped" || shipment.shippedAt !== null,
    );
  }
}
