import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_shopping_cart_add_item_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer account for isolation
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Authenticate the customer via login
  const customerLoginBody = {
    email: customerCreateBody.email,
    password: customerCreateBody.password,
    href: "http://localhost/login",
    referrer: "http://localhost/",
  } satisfies IShoppingMallCustomer.ILogin;

  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(loggedInCustomer);

  // 3. Register and login a seller
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
    href: "http://localhost/seller/login",
    referrer: "http://localhost/",
  } satisfies IShoppingMallSeller.ILogin;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(loggedInSeller);

  // 4. Seller creates a new product
  const productCreateBody = {
    code:
      typia.random<string & tags.Pattern<"^[A-Za-z0-9]{10}$">>() ||
      RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals("product code", product.code, productCreateBody.code);

  // 5. Seller creates a SKU for the new product
  const skuCreateBody = {
    sku_code:
      typia.random<string & tags.Pattern<"^[A-Za-z0-9]{12}$">>() ||
      RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);
  TestValidator.equals("sku code", sku.sku_code, skuCreateBody.sku_code);

  // 6. Customer creates a new shopping cart
  const shoppingCartCreateBody = {
    shopping_mall_customer_id: loggedInCustomer.id,
    shopping_mall_customer_session_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IShoppingMallShoppingCart.ICreate;

  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(cart);
  TestValidator.equals(
    "shopping cart customer Id",
    cart.shopping_mall_customer_id,
    loggedInCustomer.id,
  );

  // 7. Customer adds product SKU item to their shopping cart
  const cartItemCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 2,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "added sku id",
    cartItem.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals("added quantity", cartItem.quantity, 2);
}
