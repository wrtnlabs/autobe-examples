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
import type { IShoppingMallDisputeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeEvent";
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

export async function test_api_admin_dispute_event_update_correcting_status_and_timestamp(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain credentials and token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinInput = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates country and region
  const countryCreate = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreate,
    });
  typia.assert<IShoppingMallCountry>(country);

  const regionCreate = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreate,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 3. Admin creates a category
  const categoryCreate = {
    parent_id: null,
    slug: RandomGenerator.alphabets(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4. Admin creates shipping and payment methods
  const shippingMethodCreate = {
    method_code: "ground",
    display_name: "Ground Shipping",
    service_level_description: "Standard ground delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreate = {
    code: "card",
    display_name: "Credit Card",
    description: "Pay with credit card",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 5. Seller join & login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinInput = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // Seller creates a product
  const productCreate = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Switch back to admin to create SKU inventory state
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const skuInventoryStateCreate = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // Switch again to seller and create a SKU under the product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuCreate = {
    code: RandomGenerator.alphaNumeric(6) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreate,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 6. Customer join & cart/order creation
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinInput = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const cartCreate = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert<IShoppingMallCart>(cart);

  const shippingAddressSnapshotCreate = {
    recipient_name: "John Doe",
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "90001",
    state_or_region: region.name_en,
    city: "Los Angeles",
    address_line1: "123 Test Street",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreate = {
    cart_id: null,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotCreate,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please handle with care",
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert<IShoppingMallOrder>(order);

  const paymentCreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreate,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 7. Switch to admin and create dispute & initial event
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const disputeCreate = {
    dispute_code: null,
    type: "refund_dispute",
    severity: "medium",
    summary: "Customer requested refund review",
    description: "Customer claims incorrect item delivered",
    opened_at: new Date().toISOString(),
    shopping_mall_order_id: order.id,
    shopping_mall_refund_request_id: null,
    shopping_mall_payment_chargeback_id: null,
    shopping_mall_risk_case_id: null,
  } satisfies IShoppingMallDispute.ICreate;

  const dispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeCreate,
    });
  typia.assert<IShoppingMallDispute>(dispute);

  const initialOccurredAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const eventCreate = {
    event_type: "status_changed",
    status_before: "open",
    status_after: "under_investigation",
    description: "Initial investigation started",
    occurred_at: initialOccurredAt,
  } satisfies IShoppingMallDisputeEvent.ICreate;

  const initialEvent: IShoppingMallDisputeEvent =
    await api.functional.shoppingMall.admin.disputes.events.create(connection, {
      disputeCode: dispute.dispute_code,
      body: eventCreate,
    });
  typia.assert<IShoppingMallDisputeEvent>(initialEvent);

  // 8. Partial update: only change status_before/status_after/occurred_at
  const correctedOccurredAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const eventUpdateBody = {
    status_before: "triage",
    status_after: "resolved",
    occurred_at: correctedOccurredAt,
  } satisfies IShoppingMallDisputeEvent.IUpdate;

  const updatedEvent: IShoppingMallDisputeEvent =
    await api.functional.shoppingMall.admin.disputes.events.update(connection, {
      disputeCode: dispute.dispute_code,
      disputeEventId: initialEvent.id,
      body: eventUpdateBody,
    });
  typia.assert<IShoppingMallDisputeEvent>(updatedEvent);

  // 9. Assertions for partial update behavior
  TestValidator.equals(
    "status_before should be updated",
    updatedEvent.status_before,
    "triage",
  );

  TestValidator.notEquals(
    "status_before should differ from initial",
    updatedEvent.status_before,
    initialEvent.status_before,
  );

  TestValidator.equals(
    "status_after should be updated",
    updatedEvent.status_after,
    "resolved",
  );

  TestValidator.notEquals(
    "status_after should differ from initial",
    updatedEvent.status_after,
    initialEvent.status_after,
  );

  TestValidator.equals(
    "occurred_at should be updated",
    updatedEvent.occurred_at,
    correctedOccurredAt,
  );

  TestValidator.notEquals(
    "occurred_at should differ from initial",
    updatedEvent.occurred_at,
    initialEvent.occurred_at,
  );

  TestValidator.equals(
    "event_type should remain unchanged",
    updatedEvent.event_type,
    initialEvent.event_type,
  );

  TestValidator.equals(
    "description should remain unchanged",
    updatedEvent.description,
    initialEvent.description,
  );

  TestValidator.equals(
    "event id should remain the same",
    updatedEvent.id,
    initialEvent.id,
  );

  if (updatedEvent.dispute && initialEvent.dispute) {
    TestValidator.equals(
      "linked dispute code should remain consistent",
      updatedEvent.dispute.dispute_code,
      initialEvent.dispute.dispute_code,
    );
  }
}
