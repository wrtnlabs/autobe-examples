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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_order_price_snapshot_multiple_revisions(
  connection: api.IConnection,
) {
  /**
   * Validate that an admin can create multiple non-final price snapshots and
   * then a final price snapshot for the same order, and that the monetary
   * components evolve consistently across those snapshots.
   *
   * Business workflow:
   *
   * 1. Create three actors: admin, seller, and customer (using auth join APIs).
   * 2. As admin, configure country/region, a shipping method, a payment method,
   *    and an inventory state used by SKUs.
   * 3. As seller, create a product and a SKU with a concrete price and inventory
   *    configuration, then link the product to a category (admin).
   * 4. As customer, create a cart, add the SKU as a cart item, create a shipping
   *    address, and finally create an order from that cart and address using
   *    the configured shipping and payment methods.
   * 5. As admin, create two non-final price snapshots and one final price snapshot
   *    for the same order via POST
   *    /shoppingMall/admin/orders/{orderCode}/priceSnapshots.
   * 6. Verify that:
   *
   *    - All snapshot create calls succeed and return well-typed
   *         IShoppingMallOrderPriceSnapshot objects.
   *    - The first two snapshots are non-final (is_final=false), and the third
   *         snapshot is final (is_final=true).
   *    - The aggregate discounts grow between snapshots while the grand_total_amount
   *         monotonically decreases.
   *    - Each snapshot's grand_total_amount equals the derived value from its
   *         component fields.
   */

  // ---------------------------------------------------------------------------
  // 1. Admin, seller, customer bootstrap (join flows)
  // ---------------------------------------------------------------------------

  // Admin join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Seller join
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Customer join
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // ---------------------------------------------------------------------------
  // 2. Admin configuration: country, region, shipping method, payment method,
  //    inventory state
  // ---------------------------------------------------------------------------

  // Ensure admin auth context (login refresh)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // Country create
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // Region create under the country
  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // Shipping method create
  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // Payment method create
  const paymentMethodCreateBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Generic credit card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // SKU inventory state create
  const inventoryStateCreateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // ---------------------------------------------------------------------------
  // 3. Seller catalog: product + SKU (with category linking via admin)
  // ---------------------------------------------------------------------------

  // Switch to seller auth
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  // Create product as seller
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "ACME",
    model_name: "ACME-TEST-UNIT",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Switch to admin to create category and link product-category
  const adminRelogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin2);

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: "General Merchandise",
    description_en: "Test category for price snapshot scenario",
    status: "active",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // Switch to seller to create SKU
  const sellerRelogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin2);

  const skuPriceBase: number & tags.Minimum<0> = typia.random<
    number & tags.Minimum<0>
  >();
  const baseUnitPrice: number = skuPriceBase < 1000 ? 1000 : skuPriceBase; // ensure reasonably large price

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: baseUnitPrice,
    original_price: baseUnitPrice + 500,
    inventory_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10>
    >() satisfies number,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // ---------------------------------------------------------------------------
  // 4. Customer cart, address, and order creation
  // ---------------------------------------------------------------------------

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerRelogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerRelogin);

  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const cartQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: cartQuantity,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 100",
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile("010"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerRelogin.id,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: cartQuantity,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items: [orderItemCreateBody],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // ---------------------------------------------------------------------------
  // 5. Admin creates multiple price snapshots for the same order
  // ---------------------------------------------------------------------------

  const adminRelogin3: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin3);

  const quantityNumber: number = cartQuantity as number;
  const itemSubtotalAmount: number = sku.price * quantityNumber;

  // Snapshot 1: baseline, no discounts, some shipping and tax
  const snapshot1ItemDiscount = 0;
  const snapshot1OrderDiscount = 0;
  const snapshot1ShippingFee = Math.round(itemSubtotalAmount * 0.1);
  const snapshot1PaymentSurcharge = 0;
  const snapshot1Tax = Math.round(itemSubtotalAmount * 0.05);
  const snapshot1GrandTotal =
    itemSubtotalAmount -
    snapshot1ItemDiscount -
    snapshot1OrderDiscount +
    snapshot1ShippingFee +
    snapshot1PaymentSurcharge +
    snapshot1Tax;

  const snapshot1CreateBody = {
    item_subtotal_amount: itemSubtotalAmount,
    item_discount_amount: snapshot1ItemDiscount,
    order_discount_amount: snapshot1OrderDiscount,
    shipping_fee_amount: snapshot1ShippingFee,
    payment_surcharge_amount: snapshot1PaymentSurcharge,
    tax_amount: snapshot1Tax,
    grand_total_amount: snapshot1GrandTotal,
    is_final: false,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;

  const snapshot1: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.create(
      connection,
      {
        orderCode: order.order_code,
        body: snapshot1CreateBody,
      },
    );
  typia.assert(snapshot1);

  // Snapshot 2: introduce discounts, keep shipping/tax constant
  const snapshot2ItemDiscount = Math.round(itemSubtotalAmount * 0.05);
  const snapshot2OrderDiscount = Math.round(itemSubtotalAmount * 0.05);
  const snapshot2ShippingFee = snapshot1ShippingFee;
  const snapshot2PaymentSurcharge = snapshot1PaymentSurcharge;
  const snapshot2Tax = snapshot1Tax;
  const snapshot2GrandTotal =
    itemSubtotalAmount -
    snapshot2ItemDiscount -
    snapshot2OrderDiscount +
    snapshot2ShippingFee +
    snapshot2PaymentSurcharge +
    snapshot2Tax;

  const snapshot2CreateBody = {
    item_subtotal_amount: itemSubtotalAmount,
    item_discount_amount: snapshot2ItemDiscount,
    order_discount_amount: snapshot2OrderDiscount,
    shipping_fee_amount: snapshot2ShippingFee,
    payment_surcharge_amount: snapshot2PaymentSurcharge,
    tax_amount: snapshot2Tax,
    grand_total_amount: snapshot2GrandTotal,
    is_final: false,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;

  const snapshot2: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.create(
      connection,
      {
        orderCode: order.order_code,
        body: snapshot2CreateBody,
      },
    );
  typia.assert(snapshot2);

  // Snapshot 3: final snapshot with larger discounts and same shipping/tax
  const snapshot3ItemDiscount = Math.round(itemSubtotalAmount * 0.1);
  const snapshot3OrderDiscount = Math.round(itemSubtotalAmount * 0.1);
  const snapshot3ShippingFee = snapshot1ShippingFee;
  const snapshot3PaymentSurcharge = snapshot1PaymentSurcharge;
  const snapshot3Tax = snapshot1Tax;
  const snapshot3GrandTotal =
    itemSubtotalAmount -
    snapshot3ItemDiscount -
    snapshot3OrderDiscount +
    snapshot3ShippingFee +
    snapshot3PaymentSurcharge +
    snapshot3Tax;

  const snapshot3CreateBody = {
    item_subtotal_amount: itemSubtotalAmount,
    item_discount_amount: snapshot3ItemDiscount,
    order_discount_amount: snapshot3OrderDiscount,
    shipping_fee_amount: snapshot3ShippingFee,
    payment_surcharge_amount: snapshot3PaymentSurcharge,
    tax_amount: snapshot3Tax,
    grand_total_amount: snapshot3GrandTotal,
    is_final: true,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;

  const snapshot3: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.create(
      connection,
      {
        orderCode: order.order_code,
        body: snapshot3CreateBody,
      },
    );
  typia.assert(snapshot3);

  // ---------------------------------------------------------------------------
  // 6. Business assertions over snapshots:
  //    - Finality flags
  //    - Monotonic discounts and decreasing grand totals
  //    - Internal arithmetic consistency for each snapshot
  // ---------------------------------------------------------------------------

  TestValidator.predicate(
    "first snapshot should be non-final",
    snapshot1.is_final === false,
  );
  TestValidator.predicate(
    "second snapshot should be non-final",
    snapshot2.is_final === false,
  );
  TestValidator.predicate(
    "third snapshot should be final",
    snapshot3.is_final === true,
  );

  const discounts1 =
    snapshot1.item_discount_amount + snapshot1.order_discount_amount;
  const discounts2 =
    snapshot2.item_discount_amount + snapshot2.order_discount_amount;
  const discounts3 =
    snapshot3.item_discount_amount + snapshot3.order_discount_amount;

  TestValidator.predicate(
    "discounts should be non-decreasing across snapshots",
    discounts1 <= discounts2 && discounts2 <= discounts3,
  );

  TestValidator.predicate(
    "grand totals should decrease as discounts increase",
    snapshot1.grand_total_amount > snapshot2.grand_total_amount &&
      snapshot2.grand_total_amount > snapshot3.grand_total_amount,
  );

  const recomputeGrandTotal = (s: IShoppingMallOrderPriceSnapshot): number => {
    return (
      s.item_subtotal_amount -
      s.item_discount_amount -
      s.order_discount_amount +
      s.shipping_fee_amount +
      s.payment_surcharge_amount +
      s.tax_amount
    );
  };

  TestValidator.equals(
    "snapshot1 grand_total_amount equals sum of its components",
    snapshot1.grand_total_amount,
    recomputeGrandTotal(snapshot1),
  );
  TestValidator.equals(
    "snapshot2 grand_total_amount equals sum of its components",
    snapshot2.grand_total_amount,
    recomputeGrandTotal(snapshot2),
  );
  TestValidator.equals(
    "snapshot3 grand_total_amount equals sum of its components",
    snapshot3.grand_total_amount,
    recomputeGrandTotal(snapshot3),
  );

  TestValidator.predicate(
    "snapshot1 subtotal should match sku price * quantity",
    snapshot1.item_subtotal_amount === itemSubtotalAmount,
  );
  TestValidator.predicate(
    "snapshot2 subtotal should match sku price * quantity",
    snapshot2.item_subtotal_amount === itemSubtotalAmount,
  );
  TestValidator.predicate(
    "snapshot3 subtotal should match sku price * quantity",
    snapshot3.item_subtotal_amount === itemSubtotalAmount,
  );
}
