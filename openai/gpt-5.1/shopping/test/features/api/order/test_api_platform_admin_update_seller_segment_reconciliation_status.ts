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
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform administrator can update administrative
 * reconciliation metadata on a seller segment without touching immutable
 * financial/linkage fields.
 *
 * Business context:
 *
 * - Seller segments represent per-seller financial slices of a multi-seller
 *   order.
 * - Platform admins need to mark reconciliation status and write internal notes
 *   for operational tracking, while financial amounts and seller/order linkage
 *   remain immutable.
 *
 * Scenario steps (adapted to available APIs):
 *
 * 1. Register a platform admin (POST /auth/platformAdmin/join) and rely on the SDK
 *    to attach the admin access token to the connection.
 * 2. As platform admin, create supporting catalog structures:
 *
 *    - Category tree
 *    - Brand
 *    - Product (using a random seller id for association, because seller management
 *         APIs are out of scope here)
 *    - SKU for the product.
 * 3. Register a customer (POST /auth/customer/join); SDK switches the connection
 *    to customer context via Authorization header.
 * 4. As the customer, create a customer cart, add a cart item using the SKU, and
 *    place an order via POST /shoppingMall/customer/orders.
 * 5. Switch back to platform admin by logging in with the admin credentials.
 * 6. Because no listing/lookup API for seller segments is available in the
 *    provided SDK, simulate the existence of a seller segment by using a random
 *    UUID as sellerSegmentId. The purpose of this test is to validate the
 *    update operation contract and type safety rather than persistence
 *    linkage.
 * 7. Call PUT
 *    /shoppingMall/platformAdmin/orders/{orderId}/sellerSegments/{sellerSegmentId}
 *    with an IShoppingMallOrderSellerSegment.IUpdate body, setting both
 *    reconciliation_status and admin_notes.
 * 8. Use typia.assert to validate that the response conforms to
 *    IShoppingMallOrderSellerSegment and then verify that key immutable
 *    snapshot and linkage fields look consistent (non-negative amounts, correct
 *    order linkage, present seller summary).
 */
export async function test_api_platform_admin_update_seller_segment_reconciliation_status(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join); SDK will attach admin JWT to connection
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create catalog structures as platform admin
  // 2-1. Category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 2-2. Brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 2-3. Product
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();

  const productBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: `prd-${RandomGenerator.alphabets(8)}`,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 2-4. SKU under the product
  const skuBody = {
    code: `sku-${RandomGenerator.alphabets(8)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
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
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 3. Register customer; SDK will attach customer JWT token to connection
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Customer cart and cart item
  const cartBody = {
    currency_code: sku.currency,
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBody },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Test item for seller segment update",
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

  // 4-3. Create order from the cart
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 5. Switch back to platform admin (login) to perform seller segment update
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 6. Simulate retrieval of a sellerSegmentId
  const sellerSegmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Prepare reconciliation update body
  const reconciliationStatus = "reconciled";
  const adminNotes = RandomGenerator.paragraph({ sentences: 5 });

  const updateBody = {
    reconciliation_status: reconciliationStatus,
    admin_notes: adminNotes,
  } satisfies IShoppingMallOrderSellerSegment.IUpdate;

  // 7. Call the seller segment update API
  const updatedSegment: IShoppingMallOrderSellerSegment =
    await api.functional.shoppingMall.platformAdmin.orders.sellerSegments.update(
      connection,
      {
        orderId: order.id,
        sellerSegmentId,
        body: updateBody,
      },
    );
  typia.assert(updatedSegment);

  // 8. Validate structural invariants on immutable snapshot and linkage fields
  TestValidator.predicate(
    "seller segment has valid id",
    typeof updatedSegment.id === "string" && updatedSegment.id.length > 0,
  );

  TestValidator.equals(
    "seller segment remains linked to same order",
    updatedSegment.shopping_mall_order_id,
    order.id,
  );

  TestValidator.predicate(
    "segment financial snapshots are present and non-negative",
    updatedSegment.items_subtotal_amount >= 0 &&
      updatedSegment.discount_total_amount >= 0 &&
      updatedSegment.shipping_amount >= 0 &&
      updatedSegment.tax_amount >= 0 &&
      updatedSegment.grand_total_amount >= 0,
  );

  TestValidator.predicate(
    "seller summary is present on segment",
    !!updatedSegment.seller &&
      typeof updatedSegment.seller.id === "string" &&
      updatedSegment.seller.id.length > 0,
  );
}
