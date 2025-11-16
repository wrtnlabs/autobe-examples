import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_customer_cart_item_retrieval_cross_cart_isolation(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAAuth);

  const customerAId = customerAAuth.id;
  typia.assert<string & tags.Format<"uuid">>(customerAId);

  // 2. Register Customer B
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBAuth);

  const customerBId = customerBAuth.id;
  typia.assert<string & tags.Format<"uuid">>(customerBId);

  // 3. Register platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuth);

  // 4. Create category tree as platform admin
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 5. Create brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 6. Register seller and create product as seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  const sellerSummary = sellerAuth.seller;
  typia.assert<IShoppingMallSeller.ISummary>(sellerSummary);

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerSummary.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert<IShoppingMallProduct>(sellerProduct);

  // 7. Create option type for the product as seller
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 8. Create option value for that option type as seller
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 9. Create SKU for the product as platform admin
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productCode,
        body: skuCreateBody,
      },
    );
  typia.assert<IShoppingMallProductSku>(sku);

  const skuId = sku.id;
  typia.assert<string & tags.Format<"uuid">>(skuId);

  // 10. Switch to Customer A explicitly via login (to ensure correct actor)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAJoinBody.email,
      password: customerAJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com/landing",
      userAgent: "E2E-Test-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  // 11. Create Customer A cart
  const cartACreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      scenario: "cross-cart-isolation",
      actor: "customerA",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartACreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cartA);

  const cartAId = cartA.id;
  typia.assert<string & tags.Format<"uuid">>(cartAId);

  // 12. Add item to Customer A cart
  const cartAItemCreateBody = {
    skuId: skuId,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Customer A item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartAItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartAId,
        body: cartAItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartAItem);

  const cartAItemId = cartAItem.id;
  typia.assert<string & tags.Format<"uuid">>(cartAItemId);

  // 13. Switch to Customer B via login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBJoinBody.email,
      password: customerBJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com/landing",
      userAgent: "E2E-Test-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  // 14. Create Customer B cart
  const cartBCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      scenario: "cross-cart-isolation",
      actor: "customerB",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartB: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cartB);

  const cartBId = cartB.id;
  typia.assert<string & tags.Format<"uuid">>(cartBId);

  // 15. Add item to Customer B cart
  const cartBItemCreateBody = {
    skuId: skuId,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Customer B item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartBItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartBId,
        body: cartBItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartBItem);

  const cartBItemId = cartBItem.id;
  typia.assert<string & tags.Format<"uuid">>(cartBItemId);

  // 16. Switch back to Customer A and attempt cross-cart access
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAJoinBody.email,
      password: customerAJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com/landing",
      userAgent: "E2E-Test-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  await TestValidator.error(
    "customer A cannot retrieve customer B cart item using mismatched cartId",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.items.at(
        connection,
        {
          customerCartId: cartAId,
          customerCartItemId: cartBItemId,
        },
      );
    },
  );

  // 17. Positive control: Customer B retrieves their own item successfully
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBJoinBody.email,
      password: customerBJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com/landing",
      userAgent: "E2E-Test-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const retrievedBItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.at(
      connection,
      {
        customerCartId: cartBId,
        customerCartItemId: cartBItemId,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(retrievedBItem);

  TestValidator.equals(
    "retrieved customer B item id should match original",
    retrievedBItem.id,
    cartBItemId,
  );

  TestValidator.equals(
    "retrieved customer B item cart id should match cartBId",
    retrievedBItem.customerCartId,
    cartBId,
  );
}
