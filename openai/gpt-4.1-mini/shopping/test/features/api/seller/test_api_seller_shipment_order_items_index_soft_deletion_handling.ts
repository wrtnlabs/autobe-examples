import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_order_items_index_soft_deletion_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and get authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "testpassword",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  // Use token to authorize sellerConnection
  sellerConnection.headers = {
    Authorization: "Bearer " + sellerAuthorized.token.access,
  };
  // 2. Try fetching shipment order items without including soft deleted entries
  const normalFetch =
    await api.functional.shoppingMall.seller.shipmentOrderItems.index(
      sellerConnection,
      {
        body: {
          deletedAt: null,
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(normalFetch);
  // All returned shipment order items should have deletedAt === null
  for (const item of normalFetch.data) {
    TestValidator.equals(
      "deletedAt is null for normal fetch",
      item.deletedAt,
      null,
    );
  }
  // 3. Fetch shipment order items including soft deleted entries by setting deletedAt to some future date
  const includeDeletedFetch =
    await api.functional.shoppingMall.seller.shipmentOrderItems.index(
      sellerConnection,
      {
        body: {
          // deletedAt filter to include all deleted records
          deletedAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(includeDeletedFetch);
  // Validate that some soft deleted records exist in the results
  const hasDeleted = includeDeletedFetch.data.some(
    (item) => item.deletedAt !== null,
  );
  TestValidator.predicate(
    "some entries are soft deleted in includeDeletedFetch",
    hasDeleted,
  );
  // 4. Authorization test: Use a fresh connection without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized access to shipmentOrderItems",
    async () => {
      await api.functional.shoppingMall.seller.shipmentOrderItems.index(
        unauthorizedConnection,
        {
          body: { page: 1, limit: 10 },
        },
      );
    },
  );
}
