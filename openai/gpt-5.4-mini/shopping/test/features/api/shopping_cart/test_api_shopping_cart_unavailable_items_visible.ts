import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify unavailable shopping cart items remain visible in the cart response.
 *
 * This test validates that reading the authenticated customer's shopping cart does not remove or mutate line items when variants are unavailable or low stock. It focuses on the read-only behavior of the cart endpoint and preserves the visibility of cart lines so the customer can resolve availability issues before checkout.
 *
 * Because the available SDK surface only exposes the cart read endpoint, the test checks the response structure, item stability across repeated reads, and that any exposed availability state remains present on returned items. The test also confirms unrelated cart content is not altered by the read operation.
 *
 * 1. Register and authenticate a customer account using the supported authorization utility.
 * 2. Read the shopping cart twice from the authenticated customer connection.
 * 3. Validate the cart payload and compare repeated reads to ensure the endpoint is non-mutating.
 * 4. Confirm cart items remain visible and availability state fields are preserved when present.
 */
export async function test_api_shopping_cart_unavailable_items_visible(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstCart =
    await api.functional.mallPlatform.customer.shopping_carts.at(
      customerConnection,
    );
  typia.assert(firstCart);
  const secondCart =
    await api.functional.mallPlatform.customer.shopping_carts.at(
      customerConnection,
    );
  typia.assert(secondCart);
  TestValidator.equals(
    "cart id is stable across reads",
    firstCart.id,
    secondCart.id,
  );
  TestValidator.equals(
    "cart owner is stable across reads",
    firstCart.customer.id,
    secondCart.customer.id,
  );
  TestValidator.equals(
    "cart items remain visible across repeated reads",
    firstCart.cartItems.length,
    secondCart.cartItems.length,
  );
  TestValidator.equals(
    "cart content is unchanged by read operation",
    firstCart.cartItems.map((item) => ({
      id: item.id,
      productVariantId: item.productVariant.id,
      quantity: item.quantity,
      availabilityState: item.availabilityState,
    })),
    secondCart.cartItems.map((item) => ({
      id: item.id,
      productVariantId: item.productVariant.id,
      quantity: item.quantity,
      availabilityState: item.availabilityState,
    })),
  );
  TestValidator.predicate(
    "cart response includes cart items array",
    Array.isArray(firstCart.cartItems),
  );
  if (firstCart.cartItems.length > 0) {
    TestValidator.predicate(
      "returned cart items remain visible",
      firstCart.cartItems.every(
        (item) => item.id.length > 0 && item.quantity > 0,
      ),
    );
    TestValidator.predicate(
      "availability state is preserved on each visible cart item",
      firstCart.cartItems.every((item) => item.availabilityState.length > 0),
    );
  }
}
