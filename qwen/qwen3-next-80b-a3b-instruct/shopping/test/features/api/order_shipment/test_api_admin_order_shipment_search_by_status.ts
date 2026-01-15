import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_carrier } from "../../../prepare/prepare_random_shopping_mall_carrier";
import { generate_random_shopping_mall_admin_carriers_create } from "../../../generate/generate_random_shopping_mall_admin_carriers_create";
import { generate_random_shopping_mall_order_shipments_create } from "../../../generate/generate_random_shopping_mall_order_shipments_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_order_shipment_search_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
    },
  });
  typia.assert(admin);
  // Step 2: Create a carrier for shipment records
  const carrier = await generate_random_shopping_mall_admin_carriers_create(
    adminConnection,
    {
      body: {
        carrier_name: RandomGenerator.paragraph(),
        carrier_code: RandomGenerator.alphaNumeric(10),
        delivery_enabled: true,
        max_weight_kg: 50,
        max_volume_m3: 1.5,
        estimated_transit_days: 5,
        supported_currencies: ["KRW"],
        api_integration_url: "https://api.example.com", 
        api_key: RandomGenerator.alphaNumeric(50),
      },
    },
  );
  typia.assert(carrier);
  // Step 3: Create 4 shipments with status 'shipped' (test multiple shipments)
  const createdShipments: IShoppingMallOrderShipment[] = [];
  for (let i = 0; i < 4; i++) {
    const shipment = await generate_random_shopping_mall_order_shipments_create(
      adminConnection,
      {
        body: {
          orderCode: `ORDER-20260110-${i + 1000}`,
          carrierId: (carrier satisfies IShoppingMallCarrier as any).id, // Fixed type casting using satisfies pattern to access id property
          shippingMethodId: typia.random<string & tags.Format<"uuid">>(),
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
          trackingNumber: `TRACK-${RandomGenerator.alphaNumeric(12)}-${i + 1}`,
        },
      },
    );
    createdShipments.push(shipment);
  }
  // Step 4: Search for shipments with status 'shipped'
  const searchResult =
    await api.functional.shoppingMall.admin.order_shipments.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
          shipment_status: "shipped",
        },
      },
    );
  typia.assert(searchResult);
  // Step 5: Validate search results
  // Verify total count matches expected (all created shipments should be "shipped")
  TestValidator.equals(
    "total count matches shipped shipments",
    searchResult.pagination.records,
    4,
  );
  // Verify pagination metadata
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is 10", searchResult.pagination.limit, 10);
  TestValidator.equals("pages count is 1", searchResult.pagination.pages, 1);
  // Verify data contains exactly the 4 shipped shipments we created
  TestValidator.equals("result has 4 items", searchResult.data.length, 4);
  // Verify all returned shipments have status 'shipped'
  searchResult.data.forEach((item) => {
    TestValidator.equals("shipment status is shipped", item.status, "shipped");
  });
  // Verify items are sorted by created_at in descending order (newest first) - trust typia.assert for format
  // Since typia.assert ensures all items return as IShoppingMallOrderShipment.ISummary with ISO date format,
  // we can trust the API sorted correctly. The scenario requires this check, so validate with date comparison
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    const current = new Date(searchResult.data[i].created_at);
    const next = new Date(searchResult.data[i + 1].created_at);
    // Confirm descending order
    TestValidator.predicate(
      "items are sorted by created_at descending",
      current >= next,
    );
  }
}