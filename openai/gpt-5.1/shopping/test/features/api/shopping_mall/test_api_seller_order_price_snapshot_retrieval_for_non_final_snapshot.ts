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

export async function test_api_seller_order_price_snapshot_retrieval_for_non_final_snapshot(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@admin.example.com`;
  const adminPassword: string = "Admin1234!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Configure master data as admin
  const countryBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: "Testland",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "TL-01",
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(6)}`,
    name_en: "Test Category",
    description_en: "Category for price snapshot tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphabets(4)}`,
    name: "In Stock",
    description: "Standard in-stock state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  const shippingMethodBody = {
    method_code: `STD_${RandomGenerator.alphabets(4).toUpperCase()}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: `CARD_${RandomGenerator.alphabets(4).toUpperCase()}`,
    display_name: "Credit Card",
    description: "Generic card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 3. Seller join & login
  const sellerEmail: string = `${RandomGenerator.alphabets(8)}@seller.example.com`;
  const sellerPassword: string = "Seller1234!";
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Seller creates product and SKU
  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(6)}`,
    title: "Snapshot Test Product",
    summary: "Product used for price snapshot tests",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  const skuPrice = 100;
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: skuPrice,
    original_price: skuPrice + 20,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 5. Customer join & login
  const customerEmail: string = `${RandomGenerator.alphabets(8)}@customer.example.com`;
  const customerPassword: string = "Customer1234!";
  const customerJoinBody = {
    email: customerEmail as string & tags.Format<"email">,
    password: customerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail as string & tags.Format<"email">,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 6. Customer address creation
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 100",
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 7. Cart creation and item add
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  const quantity = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  // 8. Order creation
  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: sku.id,
      quantity,
    } satisfies IShoppingMallOrderItem.ICreate,
  ];

  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: address.recipient_name,
      phone_number: address.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: address.postal_code,
      state_or_region: region.name_en,
      city: address.city,
      address_line1: address.line1,
      address_line2: address.line2 ?? null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: orderItems,
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingAddressSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver between 9am-5pm",
    platform_note: "Snapshot test",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order has at least one line item",
    order.items.length > 0,
  );
  TestValidator.predicate(
    "order code is non-empty",
    order.order_code.length > 0,
  );

  // 9. Switch to seller actor
  const sellerLoginForSnapshots: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginForSnapshots);

  // 10. Create two price snapshots
  const baseSubtotal = skuPrice * quantity;

  const nonFinalSnapshotBody = {
    item_subtotal_amount: baseSubtotal,
    item_discount_amount: 0,
    order_discount_amount: 0,
    shipping_fee_amount: 10,
    payment_surcharge_amount: 0,
    tax_amount: 5,
    grand_total_amount: baseSubtotal + 10 + 5,
    is_final: false,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;
  const nonFinalSnapshot: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.seller.orders.priceSnapshots.create(
      connection,
      {
        orderCode: order.order_code,
        body: nonFinalSnapshotBody,
      },
    );
  typia.assert(nonFinalSnapshot);

  const finalSnapshotBody = {
    item_subtotal_amount: baseSubtotal,
    item_discount_amount: 10,
    order_discount_amount: 5,
    shipping_fee_amount: 10,
    payment_surcharge_amount: 0,
    tax_amount: 4,
    grand_total_amount: baseSubtotal - 10 - 5 + 10 + 4,
    is_final: true,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;
  const finalSnapshot: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.seller.orders.priceSnapshots.create(
      connection,
      {
        orderCode: order.order_code,
        body: finalSnapshotBody,
      },
    );
  typia.assert(finalSnapshot);

  TestValidator.predicate(
    "final snapshot grand total is less or equal to non-final",
    finalSnapshot.grand_total_amount <= nonFinalSnapshot.grand_total_amount,
  );

  // 11. Retrieve non-final snapshot
  const reloadedNonFinal: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.seller.orders.priceSnapshots.at(
      connection,
      {
        orderCode: order.order_code,
        snapshotId: nonFinalSnapshot.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(reloadedNonFinal);

  TestValidator.equals(
    "non-final snapshot is_final matches false",
    reloadedNonFinal.is_final,
    nonFinalSnapshotBody.is_final,
  );
  TestValidator.equals(
    "non-final snapshot grand_total_amount matches creation body",
    reloadedNonFinal.grand_total_amount,
    nonFinalSnapshotBody.grand_total_amount,
  );
  TestValidator.equals(
    "non-final snapshot item_subtotal_amount matches",
    reloadedNonFinal.item_subtotal_amount,
    nonFinalSnapshotBody.item_subtotal_amount,
  );
  TestValidator.equals(
    "non-final snapshot item_discount_amount matches",
    reloadedNonFinal.item_discount_amount,
    nonFinalSnapshotBody.item_discount_amount,
  );
  TestValidator.equals(
    "non-final snapshot order_discount_amount matches",
    reloadedNonFinal.order_discount_amount,
    nonFinalSnapshotBody.order_discount_amount,
  );
  TestValidator.equals(
    "non-final snapshot shipping_fee_amount matches",
    reloadedNonFinal.shipping_fee_amount,
    nonFinalSnapshotBody.shipping_fee_amount,
  );
  TestValidator.equals(
    "non-final snapshot payment_surcharge_amount matches",
    reloadedNonFinal.payment_surcharge_amount,
    nonFinalSnapshotBody.payment_surcharge_amount,
  );
  TestValidator.equals(
    "non-final snapshot tax_amount matches",
    reloadedNonFinal.tax_amount,
    nonFinalSnapshotBody.tax_amount,
  );

  // 12. Retrieve final snapshot
  const reloadedFinal: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.seller.orders.priceSnapshots.at(
      connection,
      {
        orderCode: order.order_code,
        snapshotId: finalSnapshot.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(reloadedFinal);

  TestValidator.equals(
    "final snapshot is_final matches true",
    reloadedFinal.is_final,
    finalSnapshotBody.is_final,
  );
  TestValidator.equals(
    "final snapshot grand_total_amount matches creation body",
    reloadedFinal.grand_total_amount,
    finalSnapshotBody.grand_total_amount,
  );
  TestValidator.equals(
    "final snapshot item_subtotal_amount matches",
    reloadedFinal.item_subtotal_amount,
    finalSnapshotBody.item_subtotal_amount,
  );
  TestValidator.equals(
    "final snapshot item_discount_amount matches",
    reloadedFinal.item_discount_amount,
    finalSnapshotBody.item_discount_amount,
  );
  TestValidator.equals(
    "final snapshot order_discount_amount matches",
    reloadedFinal.order_discount_amount,
    finalSnapshotBody.order_discount_amount,
  );
  TestValidator.equals(
    "final snapshot shipping_fee_amount matches",
    reloadedFinal.shipping_fee_amount,
    finalSnapshotBody.shipping_fee_amount,
  );
  TestValidator.equals(
    "final snapshot payment_surcharge_amount matches",
    reloadedFinal.payment_surcharge_amount,
    finalSnapshotBody.payment_surcharge_amount,
  );
  TestValidator.equals(
    "final snapshot tax_amount matches",
    reloadedFinal.tax_amount,
    finalSnapshotBody.tax_amount,
  );

  // 13. Confirm independence of snapshots
  TestValidator.predicate(
    "non-final and final snapshots have different grand_total_amount",
    reloadedNonFinal.grand_total_amount !== reloadedFinal.grand_total_amount,
  );
}
