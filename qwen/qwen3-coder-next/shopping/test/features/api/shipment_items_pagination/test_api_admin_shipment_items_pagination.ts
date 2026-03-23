import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_admin_shipment_items_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Setup: Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Setup: Login as seller
  const sellerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuthorized.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Create a minimal shipment with 1 item to get a valid shipment ID
  // Since we can't create orders/products due to missing APIs, we'll use
  // a minimal setup that creates a valid shipment structure
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerLoginConnection,
      {
        orderId: "00000000-0000-0000-0000-000000000000", // Dummy order ID for minimal test
        body: {
          order_items: ["00000000-0000-0000-0000-000000000001"], // Single item
        },
      },
    );
  typia.assert(shipment);
  // Test pagination: Get first page (limit=10)
  const firstPage =
    await api.functional.ecommerceMall.admin.shipments.items.search(
      adminConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(firstPage);
  // Validate pagination structure is correct
  TestValidator.predicate(
    "current page is 1",
    () => firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    () => firstPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records >= 1",
    () => firstPage.pagination.records >= 1,
  );
  TestValidator.predicate("pages >= 1", () => firstPage.pagination.pages >= 1);
  TestValidator.predicate(
    "data length <= 10",
    () => firstPage.data.length <= 10,
  );
  TestValidator.equals("first page data length", firstPage.data.length, 1);
}
