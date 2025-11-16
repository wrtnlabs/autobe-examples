import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_cart_items_list_cross_customer_visibility(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer-a.example.com/join",
    referrer: "https://customer-a.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAAuthorized);

  const customerAEmail = customerAAuthorized.email;

  // 2. Create a cart for Customer A
  const customerACartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "platform-admin-cart-visibility",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerACartBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cartA);

  // 3. Register Customer B
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer-b.example.com/join",
    referrer: "https://customer-b.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBAuthorized);

  const customerBEmail = customerBAuthorized.email;

  // 4. Create a cart for Customer B
  const customerBCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "platform-admin-cart-visibility",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartB: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerBCartBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cartB);

  // 5. Register platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const platformAdminEmail = platformAdminAuthorized.email;

  // 6. As platform admin, create a brand (optional but realistic catalog data)
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 7. As platform admin, create a product
  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `SKU-PROD-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 3 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert<IShoppingMallProduct>(product);

  // 8. As platform admin, create a SKU under the product
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert<IShoppingMallProductSku>(sku);

  // 9. Switch to Customer A explicitly via login
  const customerALoginBody = {
    email: customerAEmail,
    password: customerAJoinBody.password,
    ip: null,
    href: "https://customer-a.example.com/login",
    referrer: "https://customer-a.example.com/landing",
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerALogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerALogin);

  // 10. As Customer A, add items to cartA
  const cartAItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Customer A Item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartAItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartA.id,
        body: cartAItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartAItem);

  // 11. Switch to Customer B explicitly via login
  const customerBLoginBody = {
    email: customerBEmail,
    password: customerBJoinBody.password,
    ip: null,
    href: "https://customer-b.example.com/login",
    referrer: "https://customer-b.example.com/landing",
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerBLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBLogin);

  // 12. As Customer B, add items to cartB (different quantity for distinction)
  const cartBItemCreateBody = {
    skuId: sku.id,
    quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Customer B Item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartBItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartB.id,
        body: cartBItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartBItem);

  // 13. Switch back to platform admin via login
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLogin);

  // 14. As platform admin, list items for Customer A cart
  const adminCartAListBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sku_code: undefined,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallCustomerCartItem.IRequest;

  const adminCartAItemsPage: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.items.index(
      connection,
      {
        customerCartId: cartA.id,
        body: adminCartAListBody,
      },
    );
  typia.assert<IPageIShoppingMallCustomerCartItem.ISummary>(
    adminCartAItemsPage,
  );

  TestValidator.predicate(
    "admin listing for cart A should contain at least one item",
    adminCartAItemsPage.data.length > 0,
  );

  adminCartAItemsPage.data.forEach((item) => {
    TestValidator.equals(
      "every item in admin listing for cart A must have matching cartId",
      item.cartId,
      cartA.id,
    );
  });

  // 15. As platform admin, list items for Customer B cart
  const adminCartBListBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sku_code: undefined,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallCustomerCartItem.IRequest;

  const adminCartBItemsPage: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.items.index(
      connection,
      {
        customerCartId: cartB.id,
        body: adminCartBListBody,
      },
    );
  typia.assert<IPageIShoppingMallCustomerCartItem.ISummary>(
    adminCartBItemsPage,
  );

  TestValidator.predicate(
    "admin listing for cart B should contain at least one item",
    adminCartBItemsPage.data.length > 0,
  );

  adminCartBItemsPage.data.forEach((item) => {
    TestValidator.equals(
      "every item in admin listing for cart B must have matching cartId",
      item.cartId,
      cartB.id,
    );
  });

  // 16. Cross-cart separation check: no item from cart A listing should have cartId of cart B and vice versa
  adminCartAItemsPage.data.forEach((item) => {
    TestValidator.notEquals(
      "no item in cart A admin listing should belong to cart B",
      item.cartId,
      cartB.id,
    );
  });

  adminCartBItemsPage.data.forEach((item) => {
    TestValidator.notEquals(
      "no item in cart B admin listing should belong to cart A",
      item.cartId,
      cartA.id,
    );
  });

  // 17. Ensure that admin could see both carts' items (cross-customer visibility)
  TestValidator.predicate(
    "admin can see items in both customer carts",
    adminCartAItemsPage.data.length > 0 && adminCartBItemsPage.data.length > 0,
  );
}
