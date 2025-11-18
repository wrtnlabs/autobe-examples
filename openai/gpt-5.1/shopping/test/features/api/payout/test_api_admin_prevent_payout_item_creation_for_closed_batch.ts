import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify that admin cannot create payout items for a closed payout batch.
 *
 * Business workflow implemented by this test:
 *
 * 1. Join an admin and authenticate via /auth/admin/join.
 * 2. As admin, create minimal static master data required for a full order flow:
 *
 *    - Country via POST /shoppingMall/admin/countries
 *    - Region via POST /shoppingMall/admin/countries/{countryCode}/regions
 *    - Category via POST /shoppingMall/admin/categories
 *    - Shipping method via POST /shoppingMall/admin/shippingMethods
 *    - Payment method via POST /shoppingMall/admin/paymentMethods
 * 3. Join a seller and authenticate via /auth/seller/join.
 * 4. As seller, create a product via POST /shoppingMall/seller/products.
 * 5. As admin, link the product to a category via POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 6. As admin, create a SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates.
 * 7. As seller, create a SKU under the product with that inventory state via POST
 *    /shoppingMall/seller/products/{productId}/skus.
 * 8. Join a customer and authenticate via /auth/customer/join.
 * 9. As customer, create a shipping address via POST
 *    /shoppingMall/customer/customers/{customerId}/addresses, referencing
 *    created country/region.
 * 10. As customer, create a cart via POST /shoppingMall/customer/carts.
 * 11. As customer, add the SKU to the cart via POST
 *     /shoppingMall/customer/carts/{cartId}/items.
 * 12. As customer, create an order via POST /shoppingMall/customer/orders,
 *     referencing the cart, address, shipping method, and payment method.
 * 13. As customer, create an order payment via POST
 *     /shoppingMall/customer/orders/{orderId}/payments.
 * 14. As admin, create a seller earning via POST
 *     /shoppingMall/admin/sellers/{sellerId}/earnings based on the order and
 *     payment.
 * 15. As admin, create a payout batch via POST /shoppingMall/admin/payoutBatches
 *     with totals matching the earning.
 * 16. As admin, transition the payout batch status to a closed/non-editable state
 *     (for example, "completed") via PUT
 *     /shoppingMall/admin/payoutBatches/{batchCode}.
 * 17. As admin, attempt to create a payout item for that batch via POST
 *     /shoppingMall/admin/payoutBatches/{batchCode}/items, referencing the
 *     seller earning.
 * 18. Assert via TestValidator.error that payout item creation fails when the batch
 *     is closed.
 *
 * Constraints and limitations:
 *
 * - We must not assert specific HTTP status codes (e.g., 400/409) or inspect
 *   error bodies.
 * - We must not touch connection.headers directly; all auth is through the SDK
 *   auth endpoints.
 * - We only verify that an error occurs when calling the payout item creation API
 *   for a closed batch.
 */
export async function test_api_admin_prevent_payout_item_creation_for_closed_batch(
  connection: api.IConnection,
) {
  // 1. Admin join (also authenticates admin for subsequent admin calls)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Helper to avoid touching original connection.headers while ensuring unauthenticated context
  const baseConnection: api.IConnection = { ...connection };

  // 2. Admin creates country
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(baseConnection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Admin creates region under that country
  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      baseConnection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: "General Goods",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(baseConnection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 5. Admin creates a shipping method
  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(
      baseConnection,
      {
        body: shippingMethodCreateBody,
      },
    );
  typia.assert(shippingMethod);

  // 6. Admin creates a payment method
  const paymentMethodCreateBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Standard credit card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(
      baseConnection,
      {
        body: paymentMethodCreateBody,
      },
    );
  typia.assert(paymentMethod);

  // 7. Seller join (also authenticates seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(baseConnection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 8. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(baseConnection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 9. Admin links product to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      baseConnection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 10. Admin creates SKU inventory state (purchasable)
  const skuInventoryStateCreateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      baseConnection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 11. Seller creates SKU under product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(
      baseConnection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 12. Customer join (also authenticates customer)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(baseConnection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 13. Customer creates a shipping address
  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Unit 101",
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile("010"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      baseConnection,
      {
        customerId: customer.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 14. Customer creates a cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: paymentMethod.code === "CARD" ? "USD" : "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(baseConnection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 15. Customer adds SKU to cart
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      baseConnection,
      {
        cartId: cart.id as string & tags.Format<"uuid">,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 16. Customer creates an order
  const shippingAddressSnapshotCreateBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? "01000000000",
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;
  const orderItemCreateBody: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreateBody],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotCreateBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(baseConnection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 17. Customer creates an order payment
  const orderPaymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      baseConnection,
      {
        orderId: order.id,
        body: orderPaymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 18. Admin login again to ensure admin context
  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(baseConnection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 19. Admin creates a seller earning for this order & payment
  const sellerEarningCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: order.items[0]?.id ?? null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: order.grand_total_amount,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 0,
    other_fee_amount: 0,
    net_earning_amount: order.grand_total_amount,
    earning_type: "order_item" as string & tags.MinLength<1>,
    business_status: "eligible" as string & tags.MinLength<1>,
    eligible_at: new Date().toISOString() as string & tags.Format<"date-time">,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;
  const sellerEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      baseConnection,
      {
        sellerId: seller.id,
        body: sellerEarningCreateBody,
      },
    );
  typia.assert(sellerEarning);

  // 20. Admin creates a payout batch for this earning
  const payoutBatchCreateBody = {
    batch_code: RandomGenerator.alphaNumeric(12),
    payout_period_start: order.created_at,
    payout_period_end: order.created_at,
    currency_code: order.currency_code,
    total_gross_amount: sellerEarning.gross_amount,
    total_commission_amount: sellerEarning.commission_amount,
    total_net_payout_amount: sellerEarning.net_earning_amount,
    status: "draft",
    external_reference: null,
    notes: "Initial payout batch for test",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const payoutBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(
      baseConnection,
      {
        body: payoutBatchCreateBody,
      },
    );
  typia.assert(payoutBatch);

  // 21. Admin transitions batch to a closed/non-editable status (e.g., completed)
  const payoutBatchUpdateBody = {
    status: "completed",
    notes: "Batch closed for settlement",
  } satisfies IShoppingMallSellerPayoutBatch.IUpdate;
  const closedBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.update(
      baseConnection,
      {
        batchCode: payoutBatch.batchCode,
        body: payoutBatchUpdateBody,
      },
    );
  typia.assert(closedBatch);
  TestValidator.equals(
    "payout batch status updated to completed",
    closedBatch.status,
    "completed",
  );

  // 22. Attempt to create payout item for closed batch and expect error
  const payoutItemCreateBody = {
    shopping_mall_seller_earning_id: sellerEarning.id,
    currency_code: closedBatch.currencyCode,
    payout_amount: sellerEarning.net_earning_amount,
    status: "pending",
  } satisfies IShoppingMallSellerPayoutItem.ICreate;

  await TestValidator.error(
    "creating payout item for closed batch should fail",
    async () => {
      await api.functional.shoppingMall.admin.payoutBatches.items.create(
        baseConnection,
        {
          batchCode: closedBatch.batchCode,
          body: payoutItemCreateBody,
        },
      );
    },
  );
}
