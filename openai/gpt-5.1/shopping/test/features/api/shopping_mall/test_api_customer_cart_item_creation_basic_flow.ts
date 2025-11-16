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

export async function test_api_customer_cart_item_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const customerJoinInput = typia.random<IShoppingMallCustomerAuth.IJoin>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuthorized);

  // Preserve customer credentials for later login
  const customerEmail = customerJoinInput.email;
  const customerPassword = customerJoinInput.password;

  // 2. Register a platform admin (join)
  const platformAdminJoinInput =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminEmail = platformAdminJoinInput.email;
  const platformAdminPassword = platformAdminJoinInput.password;

  // 3. Create a brand as platform admin
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        logo_uri: undefined,
      } satisfies IShoppingMallBrand.ICreate,
    });
  typia.assert(brand);

  // 4. Create a category tree as platform admin (business prerequisite)
  const categoryTreeCreateInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateInput,
      },
    );
  typia.assert(categoryTree);

  // 5. Register a seller (join)
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerJoinInput.email;
  const sellerPassword = sellerJoinInput.password;

  // 6. Explicit seller login to ensure context
  const sellerLoginInput = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLoginAuthorized);

  // 7. Create a seller-owned product (multi-SKU capable)
  const productCode = RandomGenerator.alphaNumeric(12);
  const sellerProductCreateInput = {
    shopping_mall_seller_id: sellerAuthorized.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateInput,
    });
  typia.assert(sellerProduct);

  // 8. Create a product option type for the seller product
  const optionTypeCreateInput = {
    name: "color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateInput,
      },
    );
  typia.assert(optionType);

  // 9. Create a product option value under the option type
  const optionValueCreateInput = {
    value: "blue",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateInput,
      },
    );
  typia.assert(optionValue);

  // 10. Switch back to platform admin to create catalog product and SKU
  const platformAdminLoginInput = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginInput,
    });
  typia.assert(platformAdminLoginAuthorized);

  // Platform-admin-owned product referencing the same seller and brand
  const platformProductCreateInput = {
    shopping_mall_seller_id: sellerAuthorized.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const platformProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: platformProductCreateInput,
      },
    );
  typia.assert(platformProduct);

  // Create an active, purchasable SKU for the platform product
  const skuCreateInput = {
    code: RandomGenerator.alphaNumeric(10),
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
        productCode: platformProduct.code,
        body: skuCreateInput,
      },
    );
  typia.assert(sku);

  // 11. Switch actor back to customer and create a persistent customer cart
  const customerLoginInput = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://mall.example.com/login",
    referrer: "https://mall.example.com/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginInput,
    });
  typia.assert(customerLoginAuthorized);

  const customerCartCreateInput = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      scenario: "cart-item-basic-flow",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateInput,
      },
    );
  typia.assert(customerCart);

  // 12. Add a cart item referencing the created SKU
  const requestedQuantity = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const cartItemCreateInput = {
    skuId: sku.id,
    quantity: requestedQuantity,
    note: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateInput,
      },
    );
  typia.assert(cartItem);

  // 13. Assertions: validate basic business expectations
  TestValidator.equals(
    "cart item customerCartId should match created cart id",
    cartItem.customerCartId,
    customerCart.id,
  );
  TestValidator.equals(
    "cart item skuId should match created sku id",
    cartItem.skuId,
    sku.id,
  );
  TestValidator.equals(
    "cart item quantity should equal requested quantity",
    cartItem.quantity,
    requestedQuantity,
  );

  TestValidator.predicate(
    "cart item createdAt should be a non-empty string",
    cartItem.createdAt.length > 0,
  );
  TestValidator.predicate(
    "cart item updatedAt should be a non-empty string",
    cartItem.updatedAt.length > 0,
  );
}
