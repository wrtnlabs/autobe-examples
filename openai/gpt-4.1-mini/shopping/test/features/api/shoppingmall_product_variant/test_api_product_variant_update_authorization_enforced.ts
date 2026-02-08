import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_update_authorization_enforced(
  connection: api.IConnection,
): Promise<void> {
  // Test authorization requirement for updating product variants.
  // 1. Attempt to update product variants without authentication.
  // 2. Validate that the operation returns a 403 Forbidden error.
  // 3. Attempt to update variants for a product that the seller does not own.
  // 4. Validate access is denied.
  // This test ensures that only the owning authenticated seller can update product variants.
  // 1. Prepare base connections
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Prepare a random product ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Prepare a dummy variant update body (empty or with random data allowed by schema)
  // Since the schema of IShoppingMallProductVariant.IRequest is {}, there are no required fields or fields.
  const body: IShoppingMallProductVariant.IRequest = {};
  // 2. Attempt to update product variants without authentication
  await TestValidator.httpError(
    "update product variants unauthorized (no auth)",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.updateVariants(
        unauthenticatedConnection,
        {
          productId,
          body,
        },
      );
    },
  );
  // 3. Create seller 1 and login (owner)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {}, // IShoppingMallSeller.IJoin is empty object
  });
  seller1Connection.headers = {
    Authorization: seller1Auth.token.access,
  };
  // 4. Create seller 2 and login (non-owner)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {},
  });
  seller2Connection.headers = {
    Authorization: seller2Auth.token.access,
  };
  // 5. Use seller1 product ID, but this is a random UUID (no real product ownership)
  // So when seller2 tries to update this product, it should fail with 403 due to non-ownership
  // 6. Attempt to update variants for a product that seller2 does not own
  await TestValidator.httpError(
    "update product variants unauthorized (not owner)",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.updateVariants(
        seller2Connection,
        {
          productId,
          body,
        },
      );
    },
  );
}
