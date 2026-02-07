import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create shipment records for testing search functionality
  for (let i = 0; i < 5; i++) {
    const shipment = await api.functional.shoppingMall.seller.shipments.create(
      sellerConnection,
      {
        body: typia.random<IShoppingMallShipment.ICreate>(),
      },
    );
    typia.assert(shipment);
  }
  // 3. Test search by carrier name
  const carrierSearch = "Korean";
  const carrierResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        search: {
          carrier_name: carrierSearch,
        },
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(carrierResult);
  TestValidator.predicate(
    "carrier search returned results",
    carrierResult.data.length > 0,
  );
  // 4. Test search by tracking number
  const trackingResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        search: {
          tracking_number: "T123",
        },
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(trackingResult);
  TestValidator.predicate(
    "tracking search returned results",
    trackingResult.data.length > 0,
  );
  // 5. Test search by status filter
  const statusResult = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        search: {
          status: "pending" as const,
        },
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(statusResult);
  TestValidator.predicate(
    "status search returned results",
    statusResult.data.length > 0,
  );
  // 6. Test search by delivery confirmation status
  const confirmedDeliveryResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        search: {
          customer_confirmed_delivery: true,
        },
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(confirmedDeliveryResult);
  // 7. Test search with multiple filters (AND logic)
  const multiFilterResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        search: {
          carrier_name: "Logistics",
          status: "pending" as const,
        },
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(multiFilterResult);
  // 8. Test pagination with search results
  const paginationResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        search: {
          carrier_name: "Transport",
        },
        pagination: {
          current: 1,
          limit: 2,
        },
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationResult.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination info exists",
    paginationResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination info exists",
    paginationResult.pagination.limit > 0,
  );
  // 9. Test empty search results
  const emptyResult = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        search: {
          carrier_name: "NonExistentCarrier12345",
        },
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns no results",
    emptyResult.data.length,
    0,
  );
  // 10. Verify pagination structure
  TestValidator.equals(
    "pagination structure valid",
    paginationResult.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records valid",
    paginationResult.pagination.records >= 0,
    true,
  );
}
