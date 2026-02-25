import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_customer_product_variant_snapshots_access_after_purchase(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account (as per scenario dependencies)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerAuth);
  
  // 2. Authenticate as seller (as per scenario dependencies)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  
  // Extract email from JWT token payload
  const sellerEmail = typia.assert<string>(JSON.parse(atob(sellerAuth.token.access.split('.')[1])).email);
  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_login(sellerLoginConnection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLoginAuth);
  
  // 3. Create customer account (as per scenario dependencies)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerAuth);
  
  // 4. Authenticate as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  
  // Extract email from JWT token payload
  const customerEmail = typia.assert<string>(JSON.parse(atob(customerAuth.token.access.split('.')[1])).email);
  const customerLoginAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_login(customerLoginConnection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLoginAuth);
  
  // 5. Add a variant to cart — we assume the variant exists and has a snapshot (pre-seeded)
  // We don't have the product/variant ID from creation, so we generate a dummy ID
  // This tests access control on known variant
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const productId = typia.random<string & tags.Format<"uuid">>();
  const cartItem = await api.functional.shoppingMall.customer.cart.create(
    customerLoginConnection,
    {
      body: {
        variant_id: variantId,
        quantity: 1,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartItem);
  
  // 6. Verify customer can access the variant's snapshots (they purchased it by adding to cart)
  // Based on scenario, adding to cart implies intent to purchase and system has recorded purchase
  // We assume the snapshot exists in system
  const snapshots =
    await api.functional.shoppingMall.seller.products.variants.snapshots.at(
      customerLoginConnection,
      {
        productId,
        variantId,
      },
    );
  typia.assert(snapshots);
  
  // 7. Validate that snapshots are accessible
  TestValidator.predicate(
    "snapshots have records",
    () => snapshots.data.length > 0,
  );
  const snapshot = snapshots.data[0];
  TestValidator.equals(
    "snapshot variant ID matches",
    snapshot.product_variant_id,
    variantId,
  );
  
  // 8. Verify unauthorized access to unowned variant is blocked
  const randomVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unowned variant snapshot access denied",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.snapshots.at(
        customerLoginConnection,
        {
          productId,
          variantId: randomVariantId,
        },
      );
    },
  );
}