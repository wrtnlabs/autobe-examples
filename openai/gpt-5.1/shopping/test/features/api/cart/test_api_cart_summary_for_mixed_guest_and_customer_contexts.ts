import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCartSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummary";
import type { IShoppingMallCartSummaryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummaryItem";
import type { IShoppingMallCartSummaryItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummaryItemOption";
import type { IShoppingMallCartSummaryMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummaryMessage";
import type { IShoppingMallCartSummaryTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummaryTotals";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
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

/**
 * Validate that /shoppingMall/carts/summary binds to the correct cart based on
 * shopper context (guest vs authenticated customer) and does not mix items or
 * totals across contexts.
 *
 * Steps:
 *
 * 1. Platform admin joins (auto-authenticated).
 * 2. Platform admin creates a category tree and a brand.
 * 3. Seller joins (auto-authenticated).
 * 4. Seller creates a product associated with the created brand.
 * 5. Seller defines an option type and value for the product, then creates a SKU.
 * 6. As an unauthenticated guest, create a guest cart and add the SKU with a
 *    specific quantity (guestQty).
 * 7. As an authenticated customer, create a persistent customer cart and add the
 *    same SKU but with a different quantity (customerQty).
 * 8. Call PATCH /shoppingMall/carts/summary as a guest (no Authorization header)
 *    and assert that:
 *
 *    - HasErrors is false.
 *    - Totals.quantityTotal equals guestQty.
 * 9. Call PATCH /shoppingMall/carts/summary as the authenticated customer and
 *    assert that:
 *
 *    - HasErrors is false.
 *    - Totals.quantityTotal equals customerQty.
 * 10. Finally, assert that guest and customer summaries have different
 *     quantityTotal values, proving that the endpoint binds correctly to the
 *     underlying context and does not leak cart data between contexts.
 */
export async function test_api_cart_summary_for_mixed_guest_and_customer_contexts(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (join already authenticates and sets Authorization).
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword123!",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates category tree and brand.
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
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

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller joins (auto-authenticated).
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 4. Seller creates a product associated with the brand.
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Seller defines option type and value, then creates a SKU.
  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const skuBody = {
    code: skuCode,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. Guest context: create guest cart and add SKU.
  const guestToken = `guest-${RandomGenerator.alphaNumeric(12)}`;

  const guestCartBody = {
    guest_token: guestToken,
    ip: "127.0.0.1",
    user_agent: "E2E-Guest-Agent",
    referrer: "https://shop.example.com/landing",
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  const guestQty: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const guestCartItemBody = {
    sku_id: sku.id,
    quantity: guestQty,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const guestCartItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemBody,
    });
  typia.assert(guestCartItem);

  // Build an unauthenticated connection for guest summary calls.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Customer context: join and create customer cart and item.
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword123!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: guestToken,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartBody,
      },
    );
  typia.assert(customerCart);

  const customerQty: number & tags.Type<"int32"> & tags.Minimum<1> =
    3 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const customerCartItemBody = {
    skuId: sku.id as string & tags.Format<"uuid">,
    quantity: customerQty,
    note: "Customer item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const customerCartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: customerCartItemBody,
      },
    );
  typia.assert(customerCartItem);

  // 8. Call PATCH /shoppingMall/carts/summary as guest (no Authorization).
  const guestSummaryRequest = {
    region_code: "US",
    currency_code: "USD",
    include_promotions: true,
    include_shipping_estimate: true,
    include_diagnostics: false,
  } satisfies IShoppingMallCartSummary.IRequest;

  const guestSummary: IShoppingMallCartSummary =
    await api.functional.shoppingMall.carts.summary.index(guestConnection, {
      body: guestSummaryRequest,
    });
  typia.assert(guestSummary);

  TestValidator.predicate(
    "guest summary has no errors",
    guestSummary.hasErrors === false,
  );

  TestValidator.predicate(
    "guest summary has at least one item",
    guestSummary.items.length > 0,
  );

  TestValidator.equals(
    "guest summary quantityTotal matches guest cart quantity",
    guestSummary.totals.quantityTotal,
    guestQty,
  );

  // 9. Call PATCH /shoppingMall/carts/summary as authenticated customer.
  const customerSummaryRequest = {
    region_code: "US",
    currency_code: "USD",
    include_promotions: true,
    include_shipping_estimate: true,
    include_diagnostics: false,
  } satisfies IShoppingMallCartSummary.IRequest;

  const customerSummary: IShoppingMallCartSummary =
    await api.functional.shoppingMall.carts.summary.index(connection, {
      body: customerSummaryRequest,
    });
  typia.assert(customerSummary);

  TestValidator.predicate(
    "customer summary has no errors",
    customerSummary.hasErrors === false,
  );

  TestValidator.predicate(
    "customer summary has at least one item",
    customerSummary.items.length > 0,
  );

  TestValidator.equals(
    "customer summary quantityTotal matches customer cart quantity",
    customerSummary.totals.quantityTotal,
    customerQty,
  );

  // 10. Ensure the quantities (and thus carts) are not mixed between contexts.
  TestValidator.notEquals(
    "guest and customer summaries have different quantityTotal",
    customerSummary.totals.quantityTotal,
    guestSummary.totals.quantityTotal,
  );

  // Optional: validate that SKUs in both contexts align but quantities differ.
  const guestSkuIds = guestSummary.items.map((i) => i.skuId).sort();
  const customerSkuIds = customerSummary.items.map((i) => i.skuId).sort();

  TestValidator.equals(
    "guest and customer summaries reference same SKU set",
    customerSkuIds,
    guestSkuIds,
  );
}
