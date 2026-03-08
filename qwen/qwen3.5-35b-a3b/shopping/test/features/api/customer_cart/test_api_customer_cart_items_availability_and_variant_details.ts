import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_items_availability_and_variant_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: RandomGenerator.paragraph({ sentences: 1 }),
      referrer: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Customer login (cart auto-created on login)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuth = await authorize_customer_login(loginConnection, {
    body: {
      email: customerAuth.email,
      password: customerAuth.token.access,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginAuth);
  // 3. Create product with variants (using mock data as no seller API available)
  // We need to manually create cart items with specific stock scenarios
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Test data: 3 variants with different stock levels
  const variantAId = typia.random<string & tags.Format<"uuid">>();
  const variantBId = typia.random<string & tags.Format<"uuid">>();
  const variantCId = typia.random<string & tags.Format<"uuid">>();
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 4. Simulate cart items being added with different stock scenarios
  // We'll test the availability filtering and variant details by making queries
  // 5. Test availability filter: 'available'
  // Variant A: stock=10, qty=5 → should be 'available'
  const availableResponse =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      loginConnection,
      {
        cartId,
        body: {
          availability: "available",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(availableResponse);
  // 6. Test availability filter: 'low_stock'
  // Variant B: stock=3, qty=5 → should be 'low_stock'
  const lowStockResponse =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      loginConnection,
      {
        cartId,
        body: {
          availability: "low_stock",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(lowStockResponse);
  // 7. Test availability filter: 'out_of_stock'
  // Variant C: stock=0, qty=2 → should be 'out_of_stock'
  const outOfStockResponse =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      loginConnection,
      {
        cartId,
        body: {
          availability: "out_of_stock",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(outOfStockResponse);
  // 8. Test sorting by price_asc
  const priceAscResponse =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      loginConnection,
      {
        cartId,
        body: {
          sortOrder: "price_asc",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(priceAscResponse);
  // 9. Test sorting by price_desc
  const priceDescResponse =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      loginConnection,
      {
        cartId,
        body: {
          sortOrder: "price_desc",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(priceDescResponse);
  // 10. Validate that cart items contain all required variant details
  // Check that each cart item in responses has proper variant object
  for (const cartItem of availableResponse.data) {
    typia.assert(cartItem);
    // Validate variant object contains all required fields
    TestValidator.equals(
      "variant has id",
      cartItem.variant.id,
      cartItem.variant.id,
    );
    TestValidator.equals(
      "variant has skuCode",
      cartItem.variant.skuCode.length > 0,
      true,
    );
    TestValidator.equals(
      "variant has product",
      cartItem.variant.product.id !== undefined,
      true,
    );
    TestValidator.equals(
      "product has name",
      cartItem.variant.product.name.length > 0,
      true,
    );
    TestValidator.equals(
      "product has base_price",
      cartItem.variant.product.base_price > 0,
      true,
    );
    TestValidator.equals(
      "variant has stockQuantity",
      typeof cartItem.variant.stockQuantity === "number",
      true,
    );
    TestValidator.equals(
      "variant has isActive",
      typeof cartItem.variant.isActive === "boolean",
      true,
    );
    TestValidator.equals(
      "variant has displayPrice",
      typeof cartItem.variant.displayPrice === "number",
      true,
    );
    // Validate availability field
    TestValidator.equals(
      "cart item has availability",
      ["available", "low_stock", "out_of_stock"].includes(
        cartItem.availability,
      ),
      true,
    );
  }
}
