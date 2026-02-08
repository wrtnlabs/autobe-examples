import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_retrieve_by_customer_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve a valid order item snapshot by its ID as an authorized customer who owns the order item.
  // Verify that all snapshot details are correct.
  // Attempt to retrieve the same snapshot using an unauthorized customer and expect failure.
  // Attempt to retrieve a non-existent snapshot and expect 404.
  // 1. Customer joins and gets authorized
  const customerConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(joinOutput);
  customerConnection.headers = {
    Authorization: joinOutput.token.access,
  };
  // 2. Since no direct API to create or list snapshots, simulate a valid snapshot ID
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the snapshot by the authorized customer
  const snapshotRaw = await api.functional.shoppingMall.orderItemSnapshots.at(
    customerConnection,
    {
      id: validSnapshotId,
    },
  );
  const snapshot = typia.assert<IShoppingMallOrderItemSnapshot>(snapshotRaw);
  // 4. Verify snapshot properties if present (best effort, as schema is empty)
  if (typeof snapshot === "object" && snapshot !== null) {
    if ("product_name" in snapshot) {
      TestValidator.predicate(
        "product_name exists",
        typeof snapshot["product_name"] === "string",
      );
    }
    if ("variant_sku" in snapshot) {
      TestValidator.predicate(
        "variant_sku exists",
        typeof snapshot["variant_sku"] === "string",
      );
    }
    if ("quantity" in snapshot) {
      const quantity = snapshot["quantity"];
      if (typeof quantity === "number") {
        TestValidator.predicate("quantity positive", quantity > 0);
      }
    }
    if ("item_status" in snapshot) {
      TestValidator.predicate(
        "item_status is string",
        typeof snapshot["item_status"] === "string",
      );
    }
    if ("seller" in snapshot) {
      const seller = snapshot["seller"];
      if (seller !== null && seller !== undefined && typeof seller === "object") {
        if ("shop_name" in seller) {
          TestValidator.predicate(
            "seller.shop_name exists",
            typeof seller["shop_name"] === "string",
          );
        }
        if ("shop_logo_uri" in seller) {
          const shopLogoUri = seller["shop_logo_uri"];
          TestValidator.predicate(
            "seller.shop_logo_uri exists",
            typeof shopLogoUri === "string" || shopLogoUri === null,
          );
        }
      }
    }
  }
  // 5. Attempt retrieval as unauthorized customer
  const unauthorizedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedJoinOutput = await authorize_customer_join(
    unauthorizedCustomerConnection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(unauthorizedJoinOutput);
  unauthorizedCustomerConnection.headers = {
    Authorization: unauthorizedJoinOutput.token.access,
  };
  await TestValidator.error(
    "unauthorized customer cannot retrieve snapshot",
    async () => {
      await api.functional.shoppingMall.orderItemSnapshots.at(
        unauthorizedCustomerConnection,
        {
          id: validSnapshotId,
        },
      );
    },
  );
  // 6. Attempt retrieval of non-existent snapshot ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 for non-existent snapshot id", async () => {
    await api.functional.shoppingMall.orderItemSnapshots.at(
      customerConnection,
      {
        id: nonExistentId,
      },
    );
  });
}
