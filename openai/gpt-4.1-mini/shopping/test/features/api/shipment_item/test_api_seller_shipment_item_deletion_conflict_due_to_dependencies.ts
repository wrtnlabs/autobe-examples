import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the deletion of a shipment item that cannot be deleted because it is in use.
 *
 * Procedure:
 * 1. A seller registers and obtains authorization.
 * 2. The test attempts to delete a shipment item with a sample UUID supposed to be in active use.
 * 3. The test expects a 409 Conflict error indicating the deletion is blocked due to dependencies.
 * 4. Ensure no deletion success occurs.
 */
export async function test_api_seller_shipment_item_deletion_conflict_due_to_dependencies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${seller.token.access}`,
  };
  // 2. Attempt to delete a shipment item assumed to have active dependencies
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect 409 conflict error due to dependency constraint
  await TestValidator.httpError(
    "deletion conflict due to dependencies",
    409,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.erase(
        sellerConnection,
        {
          shipmentItemId,
        },
      );
    },
  );
}
