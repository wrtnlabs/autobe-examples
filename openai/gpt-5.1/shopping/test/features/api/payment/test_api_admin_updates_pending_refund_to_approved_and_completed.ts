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

export async function test_api_admin_updates_pending_refund_to_approved_and_completed(
  connection: api.IConnection,
) {
  // 1. Create admin, seller, customer accounts via join APIs
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminJoin);

  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/join",
        referrer: "https://seller.example.com/landing",
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(sellerJoin);

  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://shop.example.com/join",
        referrer: "https://shop.example.com/landing",
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(customerJoin);

  // 2. As admin, create master data: country, region, category, sku inventory state, shipping method, payment method
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/landing",
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(adminLogin);

  const countryCode = "KR";
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: countryCode,
        name_en: "Korea",
        phone_code: "+82",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert(country);

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: {
          code: "SEOUL",
          name_en: "Seoul",
          region_type: "city",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: `cat-${RandomGenerator.alphabets(8)}`,
        name_en: "General Goods",
        description_en: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "Available for purchase",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(skuInventoryState);

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "standard",
        display_name: "Standard Shipping",
        service_level_description: "Standard shipping method",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card",
        display_name: "Credit Card",
        description: "Generic card payment",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 3. Seller creates product and SKU
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/login",
        referrer: "https://seller.example.com/landing",
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLogin);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: `prd-${RandomGenerator.alphaNumeric(6)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "Test Brand",
        model_name: "Model X",
        status: "active",
        primary_image_uri: null,
        default_locale: "ko-KR",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // link category as admin
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login2",
        referrer: "https://admin.example.com/list",
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(adminLoginAgain);

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // back to seller to create SKU
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/login2",
        referrer: "https://seller.example.com/dashboard",
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLoginAgain);

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: `sku-${RandomGenerator.alphaNumeric(6)}` as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 10000,
        original_price: null,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: skuInventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // 4. Customer flow: login, create cart, add item, create address
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://shop.example.com/login",
        referrer: "https://shop.example.com/home",
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(customerLogin);

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLogin.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: "123 Test Street",
          line2: null,
          city: "Seoul",
          postal_code: "06236",
          phone_number: RandomGenerator.mobile("010"),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(customerAddress);

  // 5. Create an order from the cart
  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: sku.id,
      quantity: 2 as number & tags.Type<"int32">,
    } satisfies IShoppingMallOrderItem.ICreate,
  ];

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        cart_id: cart.id as string & tags.Format<"uuid">,
        currency_code: cart.currency_code,
        items: orderItems,
        shipping_address_id: customerAddress.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Create a logical payment for the order
  const paymentCreateBody = {
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
        body: paymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 7. Admin creates an initial pending refund
  const adminLoginForRefund: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/refund-flow",
        referrer: "https://admin.example.com/orders",
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(adminLoginForRefund);

  const requestedAmount: number = orderPayment.payable_amount / 2;

  const refundCreateBody = {
    currency_code: orderPayment.currency_code,
    requested_amount: requestedAmount,
    approved_amount: requestedAmount,
    status: "pending",
    refunded_amount: undefined,
    reason_code: "customer_request",
    reason_message: RandomGenerator.paragraph({ sentences: 4 }),
    provider_reference: undefined,
    metadata: undefined,
  } satisfies IShoppingMallPaymentRefund.ICreate;

  const initialRefund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        body: refundCreateBody,
      },
    );
  typia.assert(initialRefund);

  // 8. Update refund to approved and adjust approved_amount
  const reducedApprovedAmount: number =
    requestedAmount > 100 ? requestedAmount - 100 : requestedAmount;

  const approvedUpdateBody = {
    status: "approved",
    approved_amount: reducedApprovedAmount,
    refunded_amount: undefined,
    reason_code: "manual_adjustment",
    reason_message: RandomGenerator.paragraph({ sentences: 3 }),
    provider_reference: "REF-PROVIDER-APPROVED",
    metadata: '{"source":"admin_panel"}',
  } satisfies IShoppingMallPaymentRefund.IUpdate;

  const approvedRefund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.update(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        refundSequence: initialRefund.refund_sequence as number &
          tags.Type<"int32">,
        body: approvedUpdateBody,
      },
    );
  typia.assert(approvedRefund);

  // Assertions for approved stage
  TestValidator.equals("approved status", approvedRefund.status, "approved");
  TestValidator.equals(
    "approved amount updated",
    approvedRefund.approved_amount,
    reducedApprovedAmount,
  );
  TestValidator.equals(
    "currency unchanged after approve",
    approvedRefund.currency_code,
    initialRefund.currency_code,
  );
  TestValidator.equals(
    "payment id unchanged after approve",
    approvedRefund.shopping_mall_order_payment_id,
    initialRefund.shopping_mall_order_payment_id,
  );
  TestValidator.equals(
    "refund sequence unchanged after approve",
    approvedRefund.refund_sequence,
    initialRefund.refund_sequence,
  );
  TestValidator.equals(
    "requested amount unchanged after approve",
    approvedRefund.requested_amount,
    initialRefund.requested_amount,
  );
  TestValidator.predicate(
    "refunded amount not greater than approved on approve",
    approvedRefund.refunded_amount <= approvedRefund.approved_amount,
  );

  // 9. Update refund to completed and set refunded_amount equal to approved_amount
  const completedUpdateBody = {
    status: "completed",
    approved_amount: approvedRefund.approved_amount,
    refunded_amount: approvedRefund.approved_amount,
    reason_code: approvedRefund.reason_code,
    reason_message: RandomGenerator.paragraph({ sentences: 2 }),
    provider_reference: "REF-PROVIDER-COMPLETED",
    metadata: '{"final":true}',
  } satisfies IShoppingMallPaymentRefund.IUpdate;

  const completedRefund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.update(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        refundSequence: approvedRefund.refund_sequence as number &
          tags.Type<"int32">,
        body: completedUpdateBody,
      },
    );
  typia.assert(completedRefund);

  // 10. Assertions for completed stage
  TestValidator.equals("completed status", completedRefund.status, "completed");
  TestValidator.equals(
    "refunded equals approved on completed",
    completedRefund.refunded_amount,
    completedRefund.approved_amount,
  );
  TestValidator.equals(
    "currency unchanged after complete",
    completedRefund.currency_code,
    approvedRefund.currency_code,
  );
  TestValidator.equals(
    "payment id unchanged after complete",
    completedRefund.shopping_mall_order_payment_id,
    approvedRefund.shopping_mall_order_payment_id,
  );
  TestValidator.equals(
    "refund sequence unchanged after complete",
    completedRefund.refund_sequence,
    approvedRefund.refund_sequence,
  );
  TestValidator.predicate(
    "refunded not greater than payable",
    completedRefund.refunded_amount <= orderPayment.payable_amount,
  );

  // Immutability checks across lifecycle
  TestValidator.equals(
    "id stays same across lifecycle",
    completedRefund.id,
    initialRefund.id,
  );
  TestValidator.equals(
    "currency stays same across lifecycle",
    completedRefund.currency_code,
    initialRefund.currency_code,
  );
}
