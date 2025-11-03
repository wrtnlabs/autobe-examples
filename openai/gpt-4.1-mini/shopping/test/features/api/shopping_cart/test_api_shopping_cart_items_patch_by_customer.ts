import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
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
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_shopping_cart_items_patch_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerCreate,
    },
  );
  typia.assert(customerAuthorized);

  // 2. Login as the new customer
  const customerLogin = {
    email: customerCreate.email,
    password: "TestPassword123!",
    href: "https://example.com/",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn = await api.functional.auth.customer.login(
    connection,
    {
      body: customerLogin,
    },
  );
  typia.assert(customerLoggedIn);

  // 3. Register a seller
  const sellerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPassword123!",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerCreate,
  });
  typia.assert(sellerAuthorized);

  // 4. Login the seller
  const sellerLogin = {
    email: sellerCreate.email,
    password: "SellerPassword123!",
    href: "https://seller.example.com/",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn = await api.functional.auth.seller.login(connection, {
    body: sellerLogin,
  });
  typia.assert(sellerLoggedIn);

  // 5. Seller creates a product
  const productCreate = {
    code: `PROD-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);

  // 6. Seller creates SKUs for the product
  const skuIds: string[] = [];
  const numberOfSkus = 3;
  for (let i = 0; i < numberOfSkus; i++) {
    const skuCreate = {
      sku_code: `${productCreate.code}-SKU${i + 1}`,
      price: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
      >(),
      attributes_json: JSON.stringify({
        color: ["red", "green", "blue"][i],
        size: ["S", "M", "L"][i],
      }),
    } satisfies IShoppingMallProductSku.ICreate;
    const sku =
      await api.functional.shoppingMall.seller.products.skus.createSku(
        connection,
        {
          productCode: productCreate.code,
          body: skuCreate,
        },
      );
    typia.assert(sku);
    skuIds.push(sku.id);
  }

  // 7. Create a new shopping cart for the customer session
  // NOTE: customerAuthorized does not provide session ID, so reuse customer id as session id for test
  const shoppingCartCreate = {
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_customer_session_id: customerAuthorized.id,
  } satisfies IShoppingMallShoppingCart.ICreate;
  const shoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreate,
      },
    );
  typia.assert(shoppingCart);

  // 8. Add SKUs with quantities to shopping cart
  const itemsAdd: IShoppingMallCartItem.ICreate[] = skuIds.map((id, index) => ({
    shopping_mall_product_sku_id: id,
    quantity: index + 1,
  }));

  let patchedCartItems =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: shoppingCart.id,
        body: {
          items: itemsAdd,
        } satisfies IShoppingMallShoppingCartItem.IRequest,
      },
    );
  typia.assert(patchedCartItems);

  // 9. Update quantities in the cart, doubling each
  const itemsUpdate: IShoppingMallCartItem.ICreate[] =
    patchedCartItems.data.map((item) => ({
      shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
      quantity: item.quantity * 2,
    }));

  patchedCartItems =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: shoppingCart.id,
        body: {
          items: itemsUpdate,
        } satisfies IShoppingMallShoppingCartItem.IRequest,
      },
    );
  typia.assert(patchedCartItems);

  // 10. Remove last SKU by excluding it
  const itemsRemoveLast: IShoppingMallCartItem.ICreate[] = itemsUpdate.slice(
    0,
    -1,
  );

  patchedCartItems =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: shoppingCart.id,
        body: {
          items: itemsRemoveLast,
        } satisfies IShoppingMallShoppingCartItem.IRequest,
      },
    );
  typia.assert(patchedCartItems);

  // 11. Final validation
  TestValidator.equals(
    "final cart items count",
    patchedCartItems.data.length,
    itemsRemoveLast.length,
  );
  for (let i = 0; i < itemsRemoveLast.length; i++) {
    TestValidator.equals(
      `cart item quantity SKU ${i + 1}`,
      patchedCartItems.data[i].quantity,
      itemsRemoveLast[i].quantity,
    );
  }
}
