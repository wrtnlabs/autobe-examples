import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallGuestCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartMerge";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate merging a guest cart into an existing customer cart with overlapping
 * and unique SKUs.
 *
 * Business workflow:
 *
 * 1. Platform admin joins and logs in, then creates a brand.
 * 2. Seller joins and logs in, then creates a product and two SKUs under that
 *    product.
 * 3. A guest cart is created and populated with:
 *
 *    - SKU A with quantity q_guest_overlap
 *    - SKU B with quantity q_guest_unique
 * 4. A customer joins and logs in, then creates a persistent customer cart.
 * 5. The customer cart is pre-populated with SKU A with quantity
 *    q_customer_overlap.
 * 6. The guest cart is merged into the customer cart using merge_strategy =
 *    "sum-quantities".
 * 7. After the merge, customer cart items are listed and we assert that:
 *
 *    - For SKU A (present in both carts), quantity == q_guest_overlap +
 *         q_customer_overlap.
 *    - For SKU B (guest-only), quantity == q_guest_unique and appears exactly once.
 *    - No SKU appears more than once (no duplicate lines per SKU).
 *    - Monetary totals (subtotal and total) are monotonically non-decreasing after
 *         the merge.
 */
export async function test_api_guest_cart_merge_with_existing_customer_cart_items(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 1-2. Platform admin login (to simulate real flow; SDK will manage token)
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller joins
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3-2. Seller login
  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Seller creates a product
  const productCode = `P-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Seller creates two SKUs (A and B)
  const skuABody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
    name: "Variant A",
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuABody,
    });
  typia.assert(skuA);

  const skuBBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
    name: "Variant B",
    listPrice: 5000,
    salePrice: 4000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBBody,
    });
  typia.assert(skuB);

  // 6. Create guest cart
  const guestCartBody = {
    guest_token: `guest-${RandomGenerator.alphaNumeric(12)}`,
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (TestSuite)",
    referrer: "https://shop.example.com/landing",
    region_code: "KR-Seoul",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 7. Add items to guest cart: SKU A and SKU B
  const qGuestOverlap = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const qGuestUnique = 3 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const guestItemA: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: {
        sku_id: skuA.id,
        quantity: qGuestOverlap,
      } satisfies IShoppingMallGuestCartItem.ICreate,
    });
  typia.assert(guestItemA);

  const guestItemB: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: {
        sku_id: skuB.id,
        quantity: qGuestUnique,
      } satisfies IShoppingMallGuestCartItem.ICreate,
    });
  typia.assert(guestItemB);

  // 8. Customer joins
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 8-2. Customer login
  const customerLoginBody = {
    email: customer.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "Mozilla/5.0 (TestSuite)",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 9. Customer creates persistent cart
  const customerCartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: guestCart.guest_token,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCartBeforeMerge: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartBody,
      },
    );
  typia.assert(customerCartBeforeMerge);

  const subtotalBefore = customerCartBeforeMerge.subtotal_amount;
  const totalBefore = customerCartBeforeMerge.total_amount;

  // 10. Add overlapping SKU A to customer cart
  const qCustomerOverlap = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const customerItemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCartBeforeMerge.id,
        body: {
          skuId: skuA.id,
          quantity: qCustomerOverlap,
          note: "customer overlap item",
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(customerItemA);

  // 11. Compute expected merged quantities
  const expectedQtyA = qGuestOverlap + qCustomerOverlap;
  const expectedQtyB = qGuestUnique;

  // 12. Merge guest cart into customer cart
  const mergeBody = {
    guest_cart_id: guestCart.id,
    merge_strategy: "sum-quantities",
  } satisfies IShoppingMallGuestCartMerge.ICreate;

  const customerCartAfterMerge: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.guestCarts.mergeIntoCustomer.create(
      connection,
      {
        body: mergeBody,
      },
    );
  typia.assert(customerCartAfterMerge);

  const subtotalAfter = customerCartAfterMerge.subtotal_amount;
  const totalAfter = customerCartAfterMerge.total_amount;

  // 13. List customer cart items after merge
  const itemsPage: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.customer.customerCarts.items.index(
      connection,
      {
        customerCartId: customerCartAfterMerge.id,
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        } satisfies IShoppingMallCustomerCartItem.IRequest,
      },
    );
  typia.assert(itemsPage);

  const items = itemsPage.data;

  // 14. Validate merged quantities and uniqueness per SKU
  const overlappingItems = items.filter((item) => item.sku.id === skuA.id);
  const guestOnlyItems = items.filter((item) => item.sku.id === skuB.id);

  TestValidator.equals(
    "overlapping SKU should appear exactly once",
    overlappingItems.length,
    1,
  );
  TestValidator.equals(
    "guest-only SKU should appear exactly once",
    guestOnlyItems.length,
    1,
  );

  const overlappingItem = overlappingItems[0];
  const guestOnlyItem = guestOnlyItems[0];

  typia.assert(overlappingItem);
  typia.assert(guestOnlyItem);

  TestValidator.equals(
    "overlapping SKU merged quantity equals sum of guest and customer quantities",
    overlappingItem.quantity,
    expectedQtyA,
  );

  TestValidator.equals(
    "guest-only SKU quantity preserved from guest cart",
    guestOnlyItem.quantity,
    expectedQtyB,
  );

  // Ensure no SKU appears more than once overall
  const skuIdToCount = new Map<string, number>();
  for (const item of items) {
    const id = item.sku.id;
    const prev = skuIdToCount.get(id) ?? 0;
    skuIdToCount.set(id, prev + 1);
  }

  for (const [skuId, count] of skuIdToCount.entries()) {
    TestValidator.predicate(
      `SKU ${skuId} appears at most once in merged customer cart`,
      count <= 1,
    );
  }

  // 15. Validate totals are non-decreasing after merge
  TestValidator.predicate(
    "subtotal should be non-decreasing after merging guest cart",
    subtotalAfter >= subtotalBefore,
  );

  TestValidator.predicate(
    "total amount should be non-decreasing after merging guest cart",
    totalAfter >= totalBefore,
  );
}
