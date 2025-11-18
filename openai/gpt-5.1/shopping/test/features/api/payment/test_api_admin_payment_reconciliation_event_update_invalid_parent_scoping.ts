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
import type { IShoppingMallPaymentReconciliationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationEvent";
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

/**
 * Validate that reconciliation events cannot be updated using a mismatched
 * parent payment identifier and that such invalid attempts do not corrupt the
 * event’s association with its true parent payment.
 *
 * Business intent
 *
 * - Each IShoppingMallPaymentReconciliationEvent row is bound to a single
 *   IShoppingMallOrderPayment via shopping_mall_order_payment_id.
 * - Admin update endpoint PUT
 *   /shoppingMall/admin/payments/{orderPaymentId}/reconciliationEvents/{reconciliationEventId}
 *   must enforce that reconciliationEventId belongs to orderPaymentId.
 * - A caller must not be able to "re-parent" or touch an event by passing a
 *   different payment’s ID in the path.
 *
 * Test strategy (within available API surface)
 *
 * 1. Create all prerequisites for a realistic customer order with payments:
 *
 *    - Join a customer and log in (auth.customer.join).
 *    - Join an admin and keep that account for later (auth.admin.join).
 *    - Join a seller, who will own catalog data (auth.seller.join).
 *    - As admin, create country, region, inventory state, shipping method, payment
 *         method, category definitions.
 *    - As seller, create a product and a SKU bound to the inventory state.
 *    - As customer, create a cart, address, and an order pointing to the shipping
 *         and payment methods and containing a line item for the SKU.
 *    - As customer, create two logical payments A and B for the same order via POST
 *         /shoppingMall/customer/orders/{orderId}/payments.
 *    - Switch to admin, and create a reconciliation event RA for payment A via POST
 *         /shoppingMall/admin/payments/{orderPaymentId}/reconciliationEvents.
 * 2. Establish a stable baseline of the reconciliation event under its correct
 *    parent A:
 *
 *    - Call PUT /shoppingMall/admin/payments/{paymentA.id}/reconciliationEvents/{RA.id}
 *         with an IShoppingMallPaymentReconciliationEvent.IUpdate body that
 *         tweaks resolution_status and resolution_note to known values.
 *    - Assert the response type via typia.assert and keep this object as
 *         baselineEvent.
 * 3. Attempt an invalid cross-parent update using payment B’s ID:
 *
 *    - Use TestValidator.error with an async closure that calls the same update
 *         endpoint but with orderPaymentId = paymentB.id and
 *         reconciliationEventId = RA.id while sending another IUpdate payload.
 *    - Expect the call to throw (e.g., HttpError because the event is not found
 *         under that payment or is forbidden). We do not assert specific status
 *         codes, only that an error occurs.
 * 4. Confirm that the failed B-scoped attempt did not corrupt the event:
 *
 *    - Perform a second valid A-scoped update of RA using paymentA.id and RA.id with
 *         a different resolution_status/resolution_note.
 *    - Assert the response via typia.assert and validate business logic using
 *         TestValidator:
 *
 *         - The id remains equal to RA.id.
 *         - The orderPayment.id inside orderPayment summary equals paymentA.id.
 *         - The latest resolution_status and resolution_note match the payload from this
 *                   final A-scoped update, showing that the previous
 *                   cross-parent attempt did not succeed silently.
 *
 * We cannot re-fetch the event by GET, but by performing a last valid update
 * and getting a coherent response, we indirectly verify that the failed
 * B-scoped call did not re-parent or mutate the event in unintended ways.
 */
export async function test_api_admin_payment_reconciliation_event_update_invalid_parent_scoping(
  connection: api.IConnection,
) {
  // 1. CUSTOMER JOIN & LOGIN
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinRequest = {
    email: customerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinRequest,
    });
  typia.assert(customerAuthorized);

  // 2. ADMIN JOIN (keep credentials)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. SELLER JOIN (for product ownership)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. ADMIN: create country
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const countryBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 5. ADMIN: create region under the country
  const regionBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
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

  // 6. ADMIN: create SKU inventory state
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for immediate sale",
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

  // 7. ADMIN: create shipping method
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  // 8. ADMIN: create payment method
  const paymentMethodBody = {
    code: "card",
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

  // 9. ADMIN: create category
  const categoryBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronic products",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 10. SELLER: login and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerJoinBody.password,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBody = {
    code: "SKU-PROD-1",
    title: "Test Product",
    summary: "Test product summary",
    description: "Detailed description for test product.",
    brand: "TestBrand",
    model_name: "TB-1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 11. ADMIN: link product to category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      href: "https://admin.example.com/login2",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

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

  // 12. SELLER: login and create SKU under product with the inventory state
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerJoinBody.password,
      href: "https://seller.example.com/login2",
      referrer: "https://seller.example.com/dashboard",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuBody = {
    code: "SKU-001" as string & tags.MinLength<1> & tags.MaxLength<255>,
    barcode: "BAR-001" as
      | (string & tags.MinLength<1> & tags.MaxLength<255>)
      | null
      | undefined,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 13. CUSTOMER: login again to ensure customer auth context
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerJoinRequest.password,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com/landing",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  // 14. CUSTOMER: create cart
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

  // 15. CUSTOMER: create address for the customer
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Test Street",
    line2: "Apt 101",
    city: "Seoul",
    postal_code: "12345",
    phone_number: "+821012345678",
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

  // 16. CUSTOMER: create order referencing cart, sku, address snapshot, shipping, payment method
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const shippingSnapshotBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? "",
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreate],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 17. CUSTOMER: create two logical payments (A and B) for the order
  const payableAmountA = 100;
  const paymentCreateA = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmountA,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const paymentA: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateA,
      },
    );
  typia.assert(paymentA);

  const payableAmountB = 50;
  const paymentCreateB = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmountB,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const paymentB: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateB,
      },
    );
  typia.assert(paymentB);

  // 18. ADMIN: login to manage reconciliation events
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      href: "https://admin.example.com/login3",
      referrer: "https://admin.example.com/payments",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  // 19. ADMIN: create reconciliation event RA for payment A
  const reconCreateBody = {
    event_type: "amount_mismatch",
    provider_amount: payableAmountA,
    internal_amount: payableAmountA,
    currency_code: order.currency_code,
    resolution_status: "open",
    resolution_note: "Initial reconciliation event for payment A.",
  } satisfies IShoppingMallPaymentReconciliationEvent.ICreate;
  const reconEventA: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.create(
      connection,
      {
        orderPaymentId: paymentA.id as string & tags.Format<"uuid">,
        body: reconCreateBody,
      },
    );
  typia.assert(reconEventA);

  // 20. Establish baseline by performing a valid update under payment A
  const baselineUpdateBody = {
    event_type: reconEventA.event_type,
    provider_amount: reconEventA.provider_amount,
    internal_amount: reconEventA.internal_amount,
    currency_code: reconEventA.currency_code,
    resolution_status: "in_progress",
    resolution_note: "Investigating discrepancy for payment A.",
  } satisfies IShoppingMallPaymentReconciliationEvent.IUpdate;
  const baselineEvent: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.update(
      connection,
      {
        orderPaymentId: paymentA.id as string & tags.Format<"uuid">,
        reconciliationEventId: reconEventA.id as string & tags.Format<"uuid">,
        body: baselineUpdateBody,
      },
    );
  typia.assert(baselineEvent);

  TestValidator.equals(
    "baseline event remains associated with payment A",
    baselineEvent.orderPayment.id,
    paymentA.id,
  );

  // 21. Attempt invalid cross-parent update using payment B
  const invalidUpdateBody = {
    event_type: baselineEvent.event_type,
    provider_amount: baselineEvent.provider_amount,
    internal_amount: baselineEvent.internal_amount,
    currency_code: baselineEvent.currency_code,
    resolution_status: "resolved",
    resolution_note: "Attempted cross-payment update via payment B.",
  } satisfies IShoppingMallPaymentReconciliationEvent.IUpdate;

  await TestValidator.error(
    "cross-parent reconciliation update via payment B must fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.reconciliationEvents.update(
        connection,
        {
          orderPaymentId: paymentB.id as string & tags.Format<"uuid">,
          reconciliationEventId: reconEventA.id as string & tags.Format<"uuid">,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 22. Perform another valid update under payment A to confirm integrity
  const finalUpdateBody = {
    event_type: baselineEvent.event_type,
    provider_amount: baselineEvent.provider_amount,
    internal_amount: baselineEvent.internal_amount,
    currency_code: baselineEvent.currency_code,
    resolution_status: "resolved",
    resolution_note:
      "Final resolution for payment A after failed cross-parent attempt.",
  } satisfies IShoppingMallPaymentReconciliationEvent.IUpdate;
  const finalEvent: IShoppingMallPaymentReconciliationEvent =
    await api.functional.shoppingMall.admin.payments.reconciliationEvents.update(
      connection,
      {
        orderPaymentId: paymentA.id as string & tags.Format<"uuid">,
        reconciliationEventId: reconEventA.id as string & tags.Format<"uuid">,
        body: finalUpdateBody,
      },
    );
  typia.assert(finalEvent);

  // 23. Validate that the event is still bound to payment A and reflects final update
  TestValidator.equals(
    "final event still associated with payment A",
    finalEvent.orderPayment.id,
    paymentA.id,
  );

  TestValidator.equals(
    "final resolution_status reflects last valid update",
    finalEvent.resolution_status,
    finalUpdateBody.resolution_status,
  );

  TestValidator.equals(
    "final resolution_note reflects last valid update",
    finalEvent.resolution_note,
    finalUpdateBody.resolution_note,
  );
}
