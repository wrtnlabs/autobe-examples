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

export async function test_api_customer_cart_item_update_rejects_foreign_cart_access(
  connection: api.IConnection,
) {
  // 1. Prepare shared constants for URLs used in customer join flows
  const baseHref = "https://customer.example.com/join" as const;
  const baseReferrer = "https://customer.example.com/landing" as const;

  // 2. Seller joins to be able to create a product as seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = "seller-password-123";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Seller creates a product (seller-scoped)
  const productCode = RandomGenerator.alphaNumeric(12);
  const productName = RandomGenerator.paragraph({ sentences: 2 });

  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: productName,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // 4. PlatformAdmin creates a SKU for that product via platformAdmin.products.skus.create
  //    For feasibility, assume current connection is allowed to call platformAdmin endpoints.
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuName = `${productName}-SKU`;

  const skuCreateBody = {
    code: skuCode,
    name: skuName,
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 5. Customer A joins and implicitly authenticates
  const customerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerAPassword = "customer-A-password-123";

  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuthorized);

  // 6. Customer A creates a persistent cart
  const customerACartCreateBody = {
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
        body: customerACartCreateBody,
      },
    );
  typia.assert(customerACart);

  // 7. Customer A adds an item to their cart
  const customerACartItemCreateBody = {
    skuId: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "original note from A",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const customerACartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerACart.id,
        body: customerACartItemCreateBody,
      },
    );
  typia.assert(customerACartItem);

  // capture original values to emphasize intent (not re-read later due to lack of GET API)
  const originalQuantity = customerACartItem.quantity;
  const originalNote = customerACartItem.note ?? null;
  void originalQuantity;
  void originalNote;

  // 8. Customer B joins (switching authentication context)
  const customerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerBPassword = "customer-B-password-123";

  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuthorized);

  // 9. Customer B attempts to update Customer A's cart item
  const foreignUpdateBody = {
    quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "unauthorized modification by B",
  } satisfies IShoppingMallCustomerCartItem.IUpdate;

  await TestValidator.error(
    "foreign customer must not be able to update another customer's cart item",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.items.update(
        connection,
        {
          customerCartId: customerACart.id,
          customerCartItemId: customerACartItem.id,
          body: foreignUpdateBody,
        },
      );
    },
  );
}
