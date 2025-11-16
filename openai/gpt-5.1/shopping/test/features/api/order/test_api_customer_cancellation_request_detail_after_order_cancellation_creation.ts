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
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
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
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate that a customer can view the detail of a cancellation request they
 * just created for their own order.
 *
 * Business flow (rewritten to match available APIs and DTOs):
 *
 * 1. Register and login a platform admin (for catalog setup).
 * 2. As platform admin, create a category tree and a brand.
 * 3. Register and login a seller.
 * 4. As seller, create a product, an option type and value, a SKU, and an
 *    inventory item for that SKU.
 * 5. Register and login a customer.
 * 6. As customer, create a persistent customer cart.
 * 7. Add a cart item that references the created SKU.
 * 8. Create a wishlist and wishlist item, and exercise moveToCart/moveToWishlist
 *    flows to simulate pre-checkout behavior (best-effort with available
 *    APIs).
 * 9. Place an order from the cart using a synthesized IShoppingMallOrder.ICreate
 *    payload.
 * 10. Create a cancellation request for this order using the customer
 *     cancellationRequests.create endpoint.
 * 11. Fetch the cancellation request detail via cancellationRequests.at.
 * 12. Validate that the detail payload:
 *
 *     - References the correct order (order.id matches request.order.id),
 *     - Has a non-empty request_reason_category and matches what was sent,
 *     - Has request_status set (treat any non-empty string as initial state),
 *     - Has created_at and updated_at timestamps filled,
 *     - Has actor_type indicating a customer actor, and
 *     - Embeds a customer summary matching the logged-in customer.
 */
export async function test_api_customer_cancellation_request_detail_after_order_cancellation_creation(
  connection: api.IConnection,
) {
  // 1. Platform admin join and login
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create category tree and brand as platform admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(8)}`,
    name: "Main Catalog",
    description: "Primary category tree for tests",
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
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: "E2E test brand",
    logo_uri: "https://example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller join and login
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphabets(8)}@example.com`,
    password: "SellerPassword123!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Seller catalog: product, option type/value, SKU, inventory
  const productCode = `prod-${RandomGenerator.alphabets(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "E2E Test Product",
    short_description: "Short description",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
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
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  const skuCode = `sku-${RandomGenerator.alphabets(8)}`;
  const skuBody = {
    code: skuCode,
    name: "E2E Test SKU M",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 5. Customer join and login
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphabets(8)}@example.com`,
    password: "CustomerPassword123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 6. Create customer cart
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
      { body: cartBody },
    );
  typia.assert(cart);

  // 7. Add cart item referencing the created SKU
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test cart item",
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

  // 8. Wishlist and move flows (best-effort realism)
  const wishlistBody = {
    name: "E2E Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  const wishlistItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody,
      },
    );
  typia.assert(wishlistItem);

  const cartAfterMoveFromWishlist: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.wishlists.items.moveToCart(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistItem.id,
      },
    );
  typia.assert(cartAfterMoveFromWishlist);

  const cartAfterMoveToWishlist: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.items.moveToWishlist(
      connection,
      {
        customerCartId: cart.id,
        customerCartItemId: cartItem.id,
      },
    );
  typia.assert(cartAfterMoveToWishlist);

  // 9. Place order from prepared cart (synthetic snapshot values)
  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "E2E order note",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 10. Create cancellation request for this order
  const reasonCategory = "changed_mind";
  const cancellationCreateBody = {
    request_reason_category: reasonCategory,
    request_reason_detail: "Customer changed mind in E2E test",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;
  const createdCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(createdCancellation);

  // Basic sanity checks on created cancellation
  TestValidator.equals(
    "created cancellation order id matches order",
    createdCancellation.order.id,
    order.id,
  );
  TestValidator.equals(
    "created cancellation reason_category matches input",
    createdCancellation.request_reason_category,
    reasonCategory,
  );

  // 11. Fetch cancellation request detail
  const fetchedCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.at(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: createdCancellation.id,
      },
    );
  typia.assert(fetchedCancellation);

  // 12. Validate fetched details
  TestValidator.equals(
    "fetched cancellation id matches created",
    fetchedCancellation.id,
    createdCancellation.id,
  );
  TestValidator.equals(
    "fetched cancellation order id matches original order",
    fetchedCancellation.order.id,
    order.id,
  );
  TestValidator.equals(
    "fetched cancellation reason_category remains consistent",
    fetchedCancellation.request_reason_category,
    reasonCategory,
  );

  TestValidator.predicate(
    "cancellation request_status is non-empty",
    fetchedCancellation.request_status.length > 0,
  );

  TestValidator.predicate(
    "cancellation created_at has date-time format",
    typeof fetchedCancellation.created_at === "string" &&
      fetchedCancellation.created_at.length > 0,
  );
  TestValidator.predicate(
    "cancellation updated_at has date-time format",
    typeof fetchedCancellation.updated_at === "string" &&
      fetchedCancellation.updated_at.length > 0,
  );

  TestValidator.predicate(
    "actor_type indicates customer or includes customer",
    fetchedCancellation.actor_type.toLowerCase().includes("customer"),
  );

  TestValidator.predicate(
    "customer summary is present for cancellation",
    !!fetchedCancellation.customer &&
      fetchedCancellation.customer.id === customerLoggedIn.id,
  );
}
