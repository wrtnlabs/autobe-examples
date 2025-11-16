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
 * Validate that a platform administrator can call the seller-segment detail API
 * after a realistic end-to-end purchase flow and that the returned
 * IShoppingMallOrderSellerSegment is internally consistent.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new platform admin and obtain an authenticated admin session.
 * 2. As that admin, create a category tree.
 * 3. As that admin, create a brand.
 * 4. As that admin, create a base product using IShoppingMallProduct.ICreate.
 *
 *    - Because there is no seller-join API in the available SDK list, we use a
 *         random UUID for shopping_mall_seller_id, following the pattern of the
 *         existing mock tests.
 * 5. As that admin, create a SKU for the product using the
 *    platformAdmin/products/{productCode}/skus endpoint.
 * 6. Register and log in a customer using the customer auth join/login endpoints.
 * 7. As that customer, create a persistent cart with
 *    IShoppingMallCustomerCart.ICreate, setting simple currency/region values.
 * 8. As that customer, create a cart item pointing to the SKU id.
 * 9. As that customer, place an order from the cart using
 *    IShoppingMallOrder.ICreate with coherent monetary snapshot fields.
 * 10. Switch back to the platform admin account.
 * 11. Call GET
 *     /shoppingMall/platformAdmin/orders/{orderId}/sellerSegments/{sellerSegmentId}
 *     using the created order id and a UUID for sellerSegmentId (mirroring the
 *     existing mock e2e stub, since we have no index API to discover real
 *     segment IDs).
 * 12. Assert that the response validates as IShoppingMallOrderSellerSegment, that
 *     its monetary totals are self-consistent (grand_total_amount =
 *     items_subtotal_amount - discount_total_amount + shipping_amount +
 *     tax_amount), and that seller summary fields are populated.
 */
export async function test_api_platform_admin_view_single_seller_segment_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) to obtain admin tokens
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: "AdminPassword!234",
    ip: "127.0.0.1",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a category tree as platform admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog Tree",
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

  // 3. Create a brand as platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.test.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create a base product owned by some seller
  // We must provide shopping_mall_seller_id but have no seller-creation API;
  // use a random UUID consistent with other tests.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.com/product.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 5. Create a SKU for that product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: `Variant ${RandomGenerator.name(1)}`,
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
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 6. Register & login a customer
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.test.com`;
  const customerJoinBody = {
    email: customerEmail as string & tags.Format<"email">,
    password: "CustomerPass!234",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail as string & tags.Format<"email">,
    password: "CustomerPass!234",
    ip: "127.0.0.1",
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 7. Create a persistent customer cart
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: { test_case: "platform_admin_seller_segment_basic" },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBody },
    );
  typia.assert(customerCart);

  // 8. Add a cart item for the SKU
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test line item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 9. Create an order from the cart with coherent totals
  const itemsSubtotal = 9000;
  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please ship quickly",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 10. Switch back to platform admin for segment retrieval
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 11. Retrieve a seller segment for the order
  // We do not have an index API to discover segment IDs, so use a UUID
  // consistent with existing mock test behavior.
  const sellerSegmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerSegment: IShoppingMallOrderSellerSegment =
    await api.functional.shoppingMall.platformAdmin.orders.sellerSegments.at(
      connection,
      {
        orderId: order.id,
        sellerSegmentId,
      },
    );
  typia.assert(sellerSegment);

  // 12. Validate invariants on the seller segment
  const recomputedGrandTotal =
    sellerSegment.items_subtotal_amount -
    sellerSegment.discount_total_amount +
    sellerSegment.shipping_amount +
    sellerSegment.tax_amount;
  TestValidator.equals(
    "segment grand_total_amount matches subtotal-discount+shipping+tax",
    sellerSegment.grand_total_amount,
    recomputedGrandTotal,
  );

  TestValidator.predicate(
    "seller summary has id, email, and store_name",
    sellerSegment.seller.id.length > 0 &&
      sellerSegment.seller.email.length > 0 &&
      sellerSegment.seller.store_name.length > 0,
  );
}
