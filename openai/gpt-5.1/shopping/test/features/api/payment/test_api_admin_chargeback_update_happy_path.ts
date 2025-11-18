import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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

export async function test_api_admin_chargeback_update_happy_path(
  connection: api.IConnection,
) {
  // 1. Bootstrap: join an admin (auto-authenticates) so we can create admin-only resources.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seller joins (to own the product and SKU).
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 3. Customer joins (to own cart, order, and payment).
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // Capture useful IDs.
  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;
  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;
  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;
  void sellerId;
  void customerId;

  // 4. As admin, create geography master data: country and region.
  const countryCreateBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 5. As admin, create a category.
  const categoryCreateBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "General",
    description_en: "Generic test category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 6. As admin, create an inventory state (e.g., in_stock).
  const inventoryStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Items available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 7. As seller, create a product.
  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Product",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 8. As admin, link product to category.
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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 9. As seller, create a SKU under the product using the inventory state.
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 4999,
    original_price: 5999,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 10. As customer, create a cart (actor_type customer, rely on backend to bind actual owner).
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 11. As admin, create shipping method and payment method for order creation.
  const shippingMethodCreateBody = {
    method_code: `SHIP-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreateBody = {
    code: `PAY-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: "Test payment method",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: 0,
    max_amount: 100000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 12. As customer, create an order using the cart and shipping/payment methods.
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const shippingSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: "Test Customer",
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "94016",
    state_or_region: region.code,
    city: "San Francisco",
    address_line1: "1 Test Street",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: orderItemCreate.shopping_mall_sku_id ? cart.id : cart.id,
    currency_code: "USD",
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshotCreate,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 13. As customer, create a logical payment for the order.
  const payableAmount = order.grand_total_amount;

  const orderPaymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 14. As admin, create an initial chargeback for this payment.
  const initialChargebackCreateBody = {
    currency_code: orderPayment.currency_code,
    disputed_amount: orderPayment.captured_amount,
    chargeback_amount: 0,
    reason_code: "test_reason",
    status: "open",
    stage: "first_presentment",
    provider_reference: `CB-${RandomGenerator.alphaNumeric(8)}`,
    metadata: '{"source":"e2e-test"}',
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const initialChargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: initialChargebackCreateBody,
      },
    );
  typia.assert<IShoppingMallPaymentChargeback>(initialChargeback);

  // 15. Perform admin login again (simulating separate session) before update.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);
  TestValidator.equals("admin same id after login", adminLoggedIn.id, adminId);

  // 16. Build update payload to mutate only mutable fields.
  const updatedStatus = "won";
  const updatedStage: string | null = "arbitration";
  const updatedProviderRef: string | null =
    `CB-UPD-${RandomGenerator.alphaNumeric(8)}`;
  const updatedMetadata: string | null = '{"source":"e2e-test-update"}';

  const chargebackUpdateBody: IShoppingMallPaymentChargeback.IUpdate = {
    reason_code: initialChargeback.reason_code,
    status: updatedStatus,
    stage: updatedStage,
    provider_reference: updatedProviderRef,
    metadata: updatedMetadata,
  };

  const updatedChargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.update(
      connection,
      {
        orderPaymentId: orderPayment.id,
        chargebackId: initialChargeback.id,
        body: chargebackUpdateBody,
      },
    );
  typia.assert<IShoppingMallPaymentChargeback>(updatedChargeback);

  // 17. Business assertions: ensure correct linkage and immutability of core fields.

  // ID should remain unchanged.
  TestValidator.equals(
    "chargeback id unchanged after update",
    updatedChargeback.id,
    initialChargeback.id,
  );

  // Immutable monetary and currency fields should be unchanged when not updated.
  TestValidator.equals(
    "currency_code unchanged",
    updatedChargeback.currency_code,
    initialChargeback.currency_code,
  );
  TestValidator.equals(
    "disputed_amount unchanged",
    updatedChargeback.disputed_amount,
    initialChargeback.disputed_amount,
  );
  TestValidator.equals(
    "chargeback_amount unchanged",
    updatedChargeback.chargeback_amount,
    initialChargeback.chargeback_amount,
  );

  // Mutable fields should reflect update payload.
  TestValidator.equals(
    "status updated",
    updatedChargeback.status,
    updatedStatus,
  );
  TestValidator.equals("stage updated", updatedChargeback.stage, updatedStage);
  TestValidator.equals(
    "provider_reference updated",
    updatedChargeback.provider_reference,
    updatedProviderRef,
  );
  TestValidator.equals(
    "metadata updated",
    updatedChargeback.metadata,
    updatedMetadata,
  );

  // Ensure chargeback is still attached to the correct payment.
  if (updatedChargeback.orderPayment !== undefined) {
    TestValidator.equals(
      "chargeback orderPayment id matches logical payment id",
      updatedChargeback.orderPayment.id,
      orderPayment.id,
    );
  }
}
