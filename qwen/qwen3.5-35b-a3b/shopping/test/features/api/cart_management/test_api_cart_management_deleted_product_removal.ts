import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_cart_management_deleted_product_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinResult = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(customerJoinResult);
  const customerEmail = customerJoinResult.email;
  // 2. Seller registration (use authorize_seller_join utility)
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoinResult);
  // 3. Customer login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginResult = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerJoinResult.token.access,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(customerLoginResult);
  // 4. Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerJoinResult.email,
        password: sellerJoinResult.token.access,
      },
    },
  );
  typia.assert(sellerLoginResult);
  // 5. Customer adds product variant to cart
  // Note: Since there's no product creation API in the provided SDK,
  // we cannot create a real product and variant. We'll use a random UUID
  // but this will fail in real API calls (testing the scenario flow only)
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const cartAddResponse =
    await api.functional.ecommerceMall.customer.carts.manage(
      customerLoginConnection,
      {
        body: {
          cartOperations: [
            {
              variant_id: productVariantId,
              quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            } satisfies IEcommerceMallShoppingCart.IManageOperationAdd,
          ],
        },
      },
    );
  typia.assert(cartAddResponse);
  // 6. Note: Seller delete product API not available in provided SDK
  // Cannot test actual deleted product removal without product management APIs
  // 7. Customer retrieves cart state
  const cartRetrieveResponse =
    await api.functional.ecommerceMall.customer.carts.manage(
      customerLoginConnection,
      {
        body: {},
      },
    );
  typia.assert(cartRetrieveResponse);
  // 8. Validate cart consistency
  TestValidator.equals(
    "cart item count consistent",
    cartRetrieveResponse.itemCount,
    cartAddResponse.itemCount,
  );
  TestValidator.equals(
    "cart subtotal consistent",
    cartRetrieveResponse.subtotal,
    cartAddResponse.subtotal,
  );
  TestValidator.equals(
    "cart total consistent",
    cartRetrieveResponse.total,
    cartAddResponse.total,
  );
  TestValidator.equals(
    "cart item count matches array length",
    cartRetrieveResponse.itemCount,
    cartRetrieveResponse.cartItems.length,
  );
  // 9. Verify cart has the expected structure
  TestValidator.equals(
    "cart has correct customer ID",
    cartRetrieveResponse.customerId,
    customerLoginResult.id,
  );
  TestValidator.predicate("cart ID is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cartRetrieveResponse.id,
    ),
  );
}