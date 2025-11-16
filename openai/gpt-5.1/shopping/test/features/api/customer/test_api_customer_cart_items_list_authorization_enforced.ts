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

export async function test_api_customer_cart_items_list_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin and catalog prerequisites
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // Now connection is authenticated as platform admin

  // Create a category tree (even if not strictly required by SKU APIs)
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
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

  // Create a brand
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Create a product; sellerId is a random UUID because seller context is not under test here
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = RandomGenerator.alphaNumeric(10);

  const productBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: "{}",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // Create a SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    code: skuCode,
    name: RandomGenerator.name(2),
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
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 2. Create Customer A and their cart and item
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  // Now connection is authenticated as Customer A

  const cartABody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartABody,
      },
    );
  typia.assert(cartA);

  const cartAItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Customer A item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartAItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartA.id,
        body: cartAItemBody,
      },
    );
  typia.assert(cartAItem);

  // 3. Create Customer B as a separate actor
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  // Now connection is authenticated as Customer B

  // 4. Negative test: Customer B cannot list Customer A's cart items
  await TestValidator.error(
    "customer B cannot list customer A cart items",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.items.index(
        connection,
        {
          customerCartId: cartA.id,
          body: {
            page: 0,
            limit: 10,
            sku_code: undefined,
            status: undefined,
            created_from: undefined,
            created_to: undefined,
            sort_by: undefined,
            sort_direction: undefined,
          } satisfies IShoppingMallCustomerCartItem.IRequest,
        },
      );
    },
  );

  // 5. Positive control: Customer B can list their own cart items
  const cartBBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test-b",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartB: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBBody,
      },
    );
  typia.assert(cartB);

  const cartBItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Customer B item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartBItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartB.id,
        body: cartBItemBody,
      },
    );
  typia.assert(cartBItem);

  const pageB: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.customer.customerCarts.items.index(
      connection,
      {
        customerCartId: cartB.id,
        body: {
          page: 0,
          limit: 10,
          sku_code: undefined,
          status: undefined,
          created_from: undefined,
          created_to: undefined,
          sort_by: undefined,
          sort_direction: undefined,
        } satisfies IShoppingMallCustomerCartItem.IRequest,
      },
    );
  typia.assert(pageB);

  const pagination = pageB.pagination;
  TestValidator.predicate(
    "customer B pagination current is 0",
    pagination.current === 0,
  );
  TestValidator.predicate(
    "customer B pagination limit is positive",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "customer B pagination records is at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "customer B data length is at least 1",
    pageB.data.length >= 1,
  );

  const hasSkuInPageB = pageB.data.some((item) => item.skuId === sku.id);
  TestValidator.predicate(
    "customer B page contains item with created SKU",
    hasSkuInPageB,
  );
}
