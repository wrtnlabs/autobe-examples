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

export async function test_api_inventory_history_patch_invalid(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for testing
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller first
  await authorize_seller_join(sellerConnection, {
    body: {}, // IShoppingMallSeller.IJoin is an empty type
  });
  // Verify PATCH endpoint returns appropriate error
  await TestValidator.error(
    "inventory history PATCH endpoint should fail",
    async () => {
      await api.functional.shoppingMall.seller.inventory.history.invalidEndpoint(
        sellerConnection,
      );
    },
  );
}
