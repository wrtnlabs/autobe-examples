import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAddress";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate platform admin address search with basic filters for an order.
 *
 * Business flow:
 *
 * 1. Register platform admin, seller, and customer accounts.
 * 2. As platform admin, create category tree, brand, product, and SKU.
 * 3. As seller, create inventory for the SKU so customer can order it.
 * 4. As customer, create a cart, add the SKU as an item, and create an order.
 * 5. For that order, create multiple address snapshots (shipping/billing) with
 *    varying country_code and postal_code.
 * 6. As platform admin, call PATCH
 *    /shoppingMall/platformAdmin/orders/{orderId}/addresses with
 *    IShoppingMallOrderAddress.IRequest filters (address_type, country_code,
 *    postal_code, pagination) and validate that:
 *
 *    - Results only include snapshots matching the filters.
 *    - Address_type filtering distinguishes shipping vs billing addresses.
 *    - Pagination metadata is consistent with the number of matching rows.
 *    - A filter yielding no results returns an empty page with records = 0.
 */
export async function test_api_platform_admin_search_order_addresses_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.alphabets(8)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Register customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. As platform admin, create category tree, brand, product, and SKU
  // Make sure we are authenticated as platform admin
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // Category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  // Brand
  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Product (owned by seller)
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product-${RandomGenerator.alphabets(5)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // SKU
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuBody = {
    code: skuCode,
    name: `SKU-${RandomGenerator.alphabets(4)}`,
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

  // 5. As seller, create inventory for the SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventory);

  // 6. As customer, create cart, add item, and create order
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 3,
    note: "test order item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // For order totals, we use simple snapshot numbers based on known price
  const itemsSubtotal = cartItem.quantity * skuBody.salePrice;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 5;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  // Create initial shipping and billing address snapshots to reference in order.create
  const orderShippingAddressSnapshot = {
    address_type: "shipping",
    recipient_name: "Shipping Snapshot Recipient",
    street_line1: "123 Main St",
    street_line2: null,
    city: "New York",
    region: "NY",
    postal_code: "10001",
    country_code: "US",
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallOrderAddress.ICreate;

  const orderBillingAddressSnapshot = {
    address_type: "billing",
    recipient_name: "Billing Snapshot Recipient",
    street_line1: "456 Market St",
    street_line2: null,
    city: "San Francisco",
    region: "CA",
    postal_code: "94105",
    country_code: "US",
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallOrderAddress.ICreate;

  // To satisfy IShoppingMallOrder.ICreate, we need two existing address snapshot IDs.
  // However, the API for creating order addresses is /shoppingMall/orders/{orderId}/addresses,
  // which requires an orderId. Since order.create itself requires those IDs, the real
  // system might normally use pre-existing address entities. In this test, we will
  // simplify by generating random UUIDs for shipping_address_id and billing_address_id
  // and rely on the backend's simulation or relaxed constraints in this environment.
  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "e2e test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Create address snapshots for that order via /shoppingMall/orders/{orderId}/addresses
  const shippingCountryCode: string = "US";
  const shippingPostalPrimary = "30301";
  const shippingPostalSecondary = "30302";

  const billingCountryCode: string = "CA";
  const billingPostal = "M5H 2N2";

  // Create multiple shipping addresses (> limit) so pagination is meaningful
  const shippingSnapshots: IShoppingMallOrderAddress[] = [];
  const shippingSnapshotPrimary1 =
    await api.functional.shoppingMall.orders.addresses.create(connection, {
      orderId: order.id,
      body: {
        address_type: "shipping",
        recipient_name: "Ship Recipient 1",
        street_line1: "100 Shipping St",
        street_line2: null,
        city: "Atlanta",
        region: "GA",
        postal_code: shippingPostalPrimary,
        country_code: shippingCountryCode,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallOrderAddress.ICreate,
    });
  typia.assert(shippingSnapshotPrimary1);
  shippingSnapshots.push(shippingSnapshotPrimary1);

  const shippingSnapshotPrimary2 =
    await api.functional.shoppingMall.orders.addresses.create(connection, {
      orderId: order.id,
      body: {
        address_type: "shipping",
        recipient_name: "Ship Recipient 2",
        street_line1: "200 Shipping St",
        street_line2: null,
        city: "Atlanta",
        region: "GA",
        postal_code: shippingPostalPrimary,
        country_code: shippingCountryCode,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallOrderAddress.ICreate,
    });
  typia.assert(shippingSnapshotPrimary2);
  shippingSnapshots.push(shippingSnapshotPrimary2);

  const shippingSnapshotSecondary =
    await api.functional.shoppingMall.orders.addresses.create(connection, {
      orderId: order.id,
      body: {
        address_type: "shipping",
        recipient_name: "Ship Recipient 3",
        street_line1: "300 Shipping St",
        street_line2: null,
        city: "Atlanta",
        region: "GA",
        postal_code: shippingPostalSecondary,
        country_code: shippingCountryCode,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallOrderAddress.ICreate,
    });
  typia.assert(shippingSnapshotSecondary);
  shippingSnapshots.push(shippingSnapshotSecondary);

  // Billing address
  const billingSnapshot =
    await api.functional.shoppingMall.orders.addresses.create(connection, {
      orderId: order.id,
      body: {
        address_type: "billing",
        recipient_name: "Bill Recipient 1",
        street_line1: "10 Billing Ave",
        street_line2: null,
        city: "Toronto",
        region: "ON",
        postal_code: billingPostal,
        country_code: billingCountryCode,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallOrderAddress.ICreate,
    });
  typia.assert(billingSnapshot);

  // 8. Switch back to platform admin to use platform admin address search
  const platformAdminLogin2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin2);

  // 9. Search shipping addresses filtered by address_type and country_code/postal_code
  const limit = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const shippingSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sort_by: "created_at",
    sort_direction: "asc",
    address_type: "shipping",
    country_code: shippingCountryCode,
    postal_code: shippingPostalPrimary,
    recipient_name: undefined,
    include_deleted: false,
  } satisfies IShoppingMallOrderAddress.IRequest;

  const shippingPage: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId: order.id,
        body: shippingSearchBody,
      },
    );
  typia.assert(shippingPage);

  const shippingPagination = shippingPage.pagination;
  const shippingData = shippingPage.data;

  // Validate that response data all match filters
  TestValidator.predicate(
    "shipping search data length <= limit",
    shippingData.length <= shippingPagination.limit,
  );

  await TestValidator.predicate(
    "shipping pagination current is non-negative",
    () => Promise.resolve(shippingPagination.current >= 0),
  );

  TestValidator.equals(
    "shipping pagination limit matches request",
    shippingPagination.limit,
    limit,
  );

  TestValidator.predicate(
    "shipping records >= number of returned rows",
    shippingPagination.records >= shippingData.length,
  );

  TestValidator.predicate(
    "shipping pages >= 1 when any records exist",
    shippingPagination.records === 0
      ? shippingPagination.pages === 0
      : shippingPagination.pages >= 1,
  );

  for (const summary of shippingData) {
    // All entries must be shipping type and match filters
    TestValidator.equals(
      "shipping summary type is shipping",
      summary.type,
      "shipping",
    );
    TestValidator.equals(
      "shipping summary country matches filter",
      summary.country,
      shippingCountryCode,
    );
    TestValidator.equals(
      "shipping summary postal code matches filter",
      summary.postal_code,
      shippingPostalPrimary,
    );
    // Ensure order summary id matches our order
    TestValidator.equals(
      "shipping summary order id matches",
      summary.order.id,
      order.id,
    );
  }

  // Verify that total records for this filter are at least the number of created primary shipping addresses
  TestValidator.predicate(
    "shipping records at least number of primary shipping snapshots",
    shippingPagination.records >= 2,
  );

  // If more records than limit, pages must be >= 2
  if (shippingPagination.records > shippingPagination.limit) {
    TestValidator.predicate(
      "shipping pages >= 2 when records > limit",
      shippingPagination.pages >= 2,
    );
  }

  // 10. Search billing addresses filtered by address_type and country_code/postal_code
  const billingSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "created_at",
    sort_direction: "asc",
    address_type: "billing",
    country_code: billingCountryCode,
    postal_code: billingPostal,
    recipient_name: undefined,
    include_deleted: false,
  } satisfies IShoppingMallOrderAddress.IRequest;

  const billingPage: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId: order.id,
        body: billingSearchBody,
      },
    );
  typia.assert(billingPage);

  const billingPagination = billingPage.pagination;
  const billingData = billingPage.data;

  for (const summary of billingData) {
    TestValidator.equals(
      "billing summary type is billing",
      summary.type,
      "billing",
    );
    TestValidator.equals(
      "billing summary country matches filter",
      summary.country,
      billingCountryCode,
    );
    TestValidator.equals(
      "billing summary postal code matches filter",
      summary.postal_code,
      billingPostal,
    );
    TestValidator.equals(
      "billing summary order id matches",
      summary.order.id,
      order.id,
    );
  }

  TestValidator.predicate(
    "billing records >= number of returned rows",
    billingPagination.records >= billingData.length,
  );

  // 11. Search with a filter that matches no records
  const unmatchedPostalCode = "00000";
  const emptySearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "created_at",
    sort_direction: "asc",
    address_type: "shipping",
    country_code: shippingCountryCode,
    postal_code: unmatchedPostalCode,
    recipient_name: undefined,
    include_deleted: false,
  } satisfies IShoppingMallOrderAddress.IRequest;

  const emptyPage: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId: order.id,
        body: emptySearchBody,
      },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "empty search data length is zero",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records is zero",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages is zero",
    emptyPage.pagination.pages,
    0,
  );
}
