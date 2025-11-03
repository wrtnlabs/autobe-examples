import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test modification of shopping cart items by an authenticated customer.
 *
 * This test covers the full workflow:
 *
 * 1. Register a new customer user.
 * 2. Login as customer user.
 * 3. Assign the 'customer' role to the customer user by admin authentication.
 * 4. Authenticate as seller actor and create product with SKUs.
 * 5. Authenticate as customer again.
 * 6. Create a shopping cart for the customer session.
 * 7. Patch the shopping cart items by adding new SKUs, updating quantities of
 *    existing items, and removing some items.
 * 8. Validate the updated cart items match the expected changes.
 *
 * This test ensures multi-actor authentication, role assignment, product SKU
 * creation, shopping cart creation, and item modification workflows.
 */
export async function test_api_modify_shopping_cart_items_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signup
  const customerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customerPassword = "safe_password";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Customer login
  const sessionHref = "https://testclient.example.com/current";
  const sessionReferrer = "https://testclient.example.com/referrer";
  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: sessionHref,
        referrer: sessionReferrer,
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(loggedInCustomer);

  // 3. Admin join and login to assign role
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.com`;
  const adminPassword = "admin_password";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: sessionHref,
      referrer: sessionReferrer,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Assign customer role to customer user
  await api.functional.shoppingMall.admin.userRoles.create(connection, {
    body: {
      user_id: customer.id,
      role_name: "customer",
    } satisfies IShoppingMallUserRole.ICreate,
  });

  // 4. Seller join and login
  const sellerEmail = `${RandomGenerator.alphaNumeric(8)}@seller.com`;
  const sellerPassword = "seller_password";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sessionHref,
      referrer: sessionReferrer,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Create product code and multiple SKUs
  const productCode = `PRD-${RandomGenerator.alphaNumeric(5)}`;

  const sku1 = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(5)}`,
        price: 10000,
        attributes_json: JSON.stringify({ color: "red", size: "M" }),
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku1);

  const sku2 = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(5)}`,
        price: 15000,
        attributes_json: JSON.stringify({ color: "blue", size: "L" }),
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku2);

  // 5. Customer login again (simulate switch back to customer)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: sessionHref,
      referrer: sessionReferrer,
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Create a shopping cart
  // Since we have no direct API to get a customer session ID, we use the customer ID as a placeholder
  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id: customer.id, // Using customer.id as session id placeholder
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cart);

  // 7. Patch shopping cart items
  // Initial items: add sku1 with quantity 1
  const patchBody1 = {
    items: [
      {
        shopping_mall_product_sku_id: sku1.id,
        quantity: 1,
      },
    ],
  } satisfies IShoppingMallShoppingCartItem.IRequest;
  const update1 =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: cart.id,
        body: patchBody1,
      },
    );
  typia.assert(update1);
  TestValidator.predicate(
    "after first patch, should have one item",
    update1.data.length === 1,
  );

  // Add sku2 to cart with quantity 2, update sku1 quantity to 3
  const patchBody2 = {
    items: [
      {
        shopping_mall_product_sku_id: sku1.id,
        quantity: 3,
      },
      {
        shopping_mall_product_sku_id: sku2.id,
        quantity: 2,
      },
    ],
  } satisfies IShoppingMallShoppingCartItem.IRequest;

  const update2 =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: cart.id,
        body: patchBody2,
      },
    );
  typia.assert(update2);

  // Assert updated quantities
  const sku1Item = update2.data.find(
    (item) => item.shopping_mall_product_sku_id === sku1.id,
  );
  TestValidator.predicate("sku1 item should exist", sku1Item !== undefined);
  if (sku1Item) TestValidator.equals("sku1 quantity", sku1Item.quantity, 3);

  const sku2Item = update2.data.find(
    (item) => item.shopping_mall_product_sku_id === sku2.id,
  );
  TestValidator.predicate("sku2 item should exist", sku2Item !== undefined);
  if (sku2Item) TestValidator.equals("sku2 quantity", sku2Item.quantity, 2);

  TestValidator.predicate(
    "after second patch, should have two items",
    update2.data.length === 2,
  );

  // 8. Patch again to remove sku2 by not including it
  const patchBody3 = {
    items: [
      {
        shopping_mall_product_sku_id: sku1.id,
        quantity: 5,
      },
    ],
  } satisfies IShoppingMallShoppingCartItem.IRequest;
  const update3 =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: cart.id,
        body: patchBody3,
      },
    );
  typia.assert(update3);

  const sku1ItemAfter = update3.data.find(
    (item) => item.shopping_mall_product_sku_id === sku1.id,
  );
  TestValidator.predicate(
    "sku1 item should still exist",
    sku1ItemAfter !== undefined,
  );
  if (sku1ItemAfter)
    TestValidator.equals("sku1 new quantity", sku1ItemAfter.quantity, 5);

  const sku2ItemAfter = update3.data.find(
    (item) => item.shopping_mall_product_sku_id === sku2.id,
  );
  TestValidator.predicate(
    "sku2 item should be removed",
    sku2ItemAfter === undefined,
  );
  TestValidator.predicate(
    "after third patch, should have one item",
    update3.data.length === 1,
  );
}
