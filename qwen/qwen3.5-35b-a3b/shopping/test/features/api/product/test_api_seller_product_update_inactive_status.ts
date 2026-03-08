import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_update_inactive_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Use sellerConnection directly - headers already set by authorize_seller_join
  const authenticatedConnection: api.IConnection = sellerConnection;
  // 3. Product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Set product to inactive status
  const inactiveProduct: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.update(
      authenticatedConnection,
      {
        productId: productId,
        body: {
          is_active: false,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(inactiveProduct);
  // 5. Verify product is inactive
  TestValidator.equals("product is inactive", inactiveProduct.is_active, false);
  // 6. Verify seller relationship intact
  TestValidator.equals(
    "seller ID matches",
    authorized.id,
    inactiveProduct.seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    authorized.email,
    inactiveProduct.seller.email,
  );
  // 7. Verify category relationship intact
  typia.assert(inactiveProduct.category);
  const categoryId: string & tags.Format<"uuid"> = inactiveProduct.category.id;
  // 8. Reactivate product
  const activeProduct: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.update(
      authenticatedConnection,
      {
        productId: productId,
        body: {
          is_active: true,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(activeProduct);
  // 9. Verify product is active again
  TestValidator.equals(
    "product is active after reactivation",
    activeProduct.is_active,
    true,
  );
  // 10. Verify product ID unchanged
  TestValidator.equals("product ID unchanged", activeProduct.id, productId);
  // 11. Verify category relationship preserved
  TestValidator.equals(
    "category preserved",
    categoryId,
    activeProduct.category.id,
  );
  // 12. Verify seller relationship preserved
  TestValidator.equals(
    "seller preserved",
    authorized.id,
    activeProduct.seller.id,
  );
}
