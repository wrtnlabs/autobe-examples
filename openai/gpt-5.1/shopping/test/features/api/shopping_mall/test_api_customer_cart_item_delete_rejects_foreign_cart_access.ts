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

export async function test_api_customer_cart_item_delete_rejects_foreign_cart_access(
  connection: api.IConnection,
) {
  // 1) Create a platform admin and login, to be able to create catalog data
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2) Create a category tree (even if not strictly required by the SKU flow, it is a realistic prerequisite)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(8)}`,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3) Create a brand under platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.alphabets(5)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4) Create a seller and login, to own the product
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "SellerPass123!",
    storeName: `Store ${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // The seller.join endpoint already sets Authorization header, no extra login is required here.

  // 5) Create a seller product which will be later referenced by a platform-admin product/SKU if needed
  const sellerProductCode = `SP-${RandomGenerator.alphaNumeric(10)}`;
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode,
    name: `Seller Product ${RandomGenerator.alphabets(6)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // 6) Create a platform-admin product that points to same seller + brand (to be used for SKU creation)
  //    Note: IShoppingMallProduct.ICreate requires shopping_mall_seller_id and optional brand id
  const platformProductCode = `PP-${RandomGenerator.alphaNumeric(10)}`;
  const platformProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: platformProductCode,
    name: `Platform Product ${RandomGenerator.alphabets(6)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/platform-product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const platformProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: platformProductCreateBody,
      },
    );
  typia.assert(platformProduct);

  // 7) As seller, create an option type under the seller product, then create an option value for it
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 8) As platform admin, create a SKU under the platform product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuBody = {
    code: skuCode,
    name: `Variant ${skuCode}`,
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
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 9) Register Customer A and obtain its authorized session (SDK manages headers)
  const customerAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: "CustomerAPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerA);

  // At this point, connection is authenticated as Customer A.

  // 10) Customer A creates a persistent cart
  const customerACartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerACart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerACartBody,
      },
    );
  typia.assert(customerACart);

  // 11) Customer A adds an item (the SKU we created) to their cart
  const customerACartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Customer A owns this item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const customerACartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerACart.id,
        body: customerACartItemBody,
      },
    );
  typia.assert(customerACartItem);

  // Sanity: ensure the cart IDs match between the cart and the item
  TestValidator.equals(
    "cart id on item should match customer cart id",
    customerACartItem.customerCartId,
    customerACart.id,
  );

  // 12) Capture identifiers that should remain valid only for Customer A
  const victimCartId: string & tags.Format<"uuid"> = customerACart.id;
  const victimCartItemId: string & tags.Format<"uuid"> = customerACartItem.id;

  // 13) Register Customer B and switch context to them
  const customerBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: "CustomerBPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerB);

  // The Authorization header now belongs to Customer B.

  // 14) As Customer B, attempt to delete the item belonging to Customer A’s cart.
  await TestValidator.error("foreign cart item delete must fail", async () => {
    await api.functional.shoppingMall.customer.customerCarts.items.erase(
      connection,
      {
        customerCartId: victimCartId,
        customerCartItemId: victimCartItemId,
      },
    );
  });

  // 15) Switch back to Customer A via login to verify that Customer A can still delete the item themselves.
  const customerALoginBody = {
    email: customerAJoinBody.email,
    password: customerAJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerALogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALogin);

  // 16) As Customer A, delete the cart item. This must succeed without throwing.
  await api.functional.shoppingMall.customer.customerCarts.items.erase(
    connection,
    {
      customerCartId: victimCartId,
      customerCartItemId: victimCartItemId,
    },
  );

  // If we reached here without error, we can assert the key business rule through behavior:
  // - Foreign user B could not delete the item (TestValidator.error assertion)
  // - Owner user A could delete the same item successfully.
  TestValidator.predicate(
    "foreign cart deletion was rejected while owner deletion succeeded",
    true,
  );
}
