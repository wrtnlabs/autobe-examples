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
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Verify that a customer cannot update another customer's order cancellation
 * request.
 *
 * Business context:
 *
 * - Customer A places an order in the shopping mall and submits a cancellation
 *   request.
 * - Customer B is a different authenticated customer.
 * - Even if Customer B somehow learns the orderId and cancellationRequestId
 *   belonging to Customer A, they must not be able to modify Customer A's
 *   cancellation request via the customer-update API.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform admin (join automatically
 *    authenticates).
 * 2. As platform admin, create minimal catalog context:
 *
 *    - A category tree (not strictly required by the later calls but realistic).
 *    - A brand.
 *    - A product owned by a synthetic seller id and associated with the brand.
 *    - A SKU under that product that is active and purchasable.
 * 3. Register Customer A via /auth/customer/join (this authenticates as A).
 * 4. As Customer A:
 *
 *    - Create a customer cart.
 *    - Add a cart item referencing the created SKU.
 *    - Create an order from that cart with consistent monetary snapshot values and
 *         random UUIDs for shipping/billing address ids.
 *    - Create a cancellation request for that order with a specific
 *         request_reason_category and request_reason_detail.
 * 5. Register Customer B via /auth/customer/join (this authenticates as B and
 *    switches the SDK's Authorization header to B's token).
 * 6. While authenticated as Customer B, attempt to update Customer A's
 *    cancellation request using PUT
 *    /shoppingMall/customer/orders/{orderId}/cancellationRequests/{cancellationRequestId},
 *    changing the reason category and detail.
 * 7. Assert that the update call fails (authorization error) using
 *    TestValidator.error, thereby confirming that a different customer cannot
 *    update another customer's cancellation request.
 *
 * Due to missing read APIs for cancellation requests, we only verify that the
 * unauthorized update attempt fails; we do not re-read the resource to assert
 * immutability of its fields.
 */
export async function test_api_customer_cancellation_request_update_rejected_for_other_customers_order(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(2),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2-1. Create a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Main Catalog Tree",
    description: "E2E test category tree",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 2-2. Create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: "E2E brand for cancellation request test",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 2-3. Create a product (using a synthetic seller id)
  const syntheticSellerId = typia.random<string & tags.Format<"uuid">>();

  const productBody = {
    shopping_mall_seller_id: syntheticSellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: "Test Product for Cancellation",
    short_description: "Short description",
    description: "Long test description for E2E product",
    status: "active" as string & tags.MinLength<1>,
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

  // 2-4. Create a SKU for that product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Variant",
    listPrice: 100,
    salePrice: 100,
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

  // 3. Register Customer A (join authenticates as A)
  const customerAEmail =
    `${RandomGenerator.alphabets(8)}@customer.example.com` as string &
      tags.Format<"email">;
  const customerAJoinBody = {
    email: customerAEmail,
    password: "CustomerAPass123!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuthorized);

  // 4-1. Customer A creates a cart
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "cancellation-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerACart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(customerACart);

  // 4-2. Customer A adds a cart item for the SKU
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Item for cancellation request test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerACart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 4-3. Customer A creates an order from the cart
  const itemsSubtotal = 100;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: customerACart.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 4-4. Customer A creates a cancellation request for the order
  const initialReasonCategory = "customer_changed_mind";
  const initialReasonDetail = RandomGenerator.paragraph({ sentences: 5 });

  const cancellationCreateBody = {
    request_reason_category: initialReasonCategory,
    request_reason_detail: initialReasonDetail,
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellationRequest);

  // 5. Register Customer B (this authenticates as B and switches token)
  const customerBEmail =
    `${RandomGenerator.alphabets(8)}@customer.example.com` as string &
      tags.Format<"email">;
  const customerBJoinBody = {
    email: customerBEmail,
    password: "CustomerBPass123!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuthorized);

  // 6. As Customer B, attempt to update Customer A's cancellation request
  const maliciousUpdateBody = {
    request_reason_category: "malicious_update_attempt",
    request_reason_detail:
      "Customer B is trying to modify someone else's request.",
  } satisfies IShoppingMallOrderCancellationRequest.IUpdate;

  await TestValidator.error(
    "other customer cannot update another customer's cancellation request",
    async () => {
      await api.functional.shoppingMall.customer.orders.cancellationRequests.update(
        connection,
        {
          orderId: order.id,
          cancellationRequestId: cancellationRequest.id,
          body: maliciousUpdateBody,
        },
      );
    },
  );
}
