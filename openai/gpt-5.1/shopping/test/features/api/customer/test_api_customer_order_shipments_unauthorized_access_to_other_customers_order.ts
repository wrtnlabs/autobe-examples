import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
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
 * Verify that an authenticated customer cannot list shipments for another
 * customer's order using PATCH
 * /shoppingMall/customer/orders/{orderCode}/shipments.
 *
 * Business flow:
 *
 * 1. Register Customer A and Customer B via customer join.
 * 2. Register a Seller and an Admin via their respective join endpoints.
 * 3. As Admin, create a country and region.
 * 4. As Customer A, create a customer address using that country/region.
 * 5. As Admin, create an SKU inventory state.
 * 6. As Seller, create a product and a SKU using the inventory state.
 * 7. As Admin, create a shipping method and a payment method.
 * 8. As Customer A, create a cart and an order that purchases the SKU.
 * 9. As Customer A, create a shipping address snapshot for the order.
 * 10. As Admin, create a shipment for Customer A's order.
 * 11. As Customer A, verify they can list their own shipments via the
 *     shipments.index endpoint.
 * 12. As Customer B, attempt to list shipments for Customer A's order and assert
 *     that an authorization-related error is thrown.
 * 13. Create a separate order and shipment for Customer B and verify that B can
 *     successfully list shipments for their own order.
 */
export async function test_api_customer_order_shipments_unauthorized_access_to_other_customers_order(
  connection: api.IConnection,
) {
  const href: string = "https://example.com/join";
  const referrer: string = "https://example.com";

  // 1. Register Customer A
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPassword: string = "Password123!";
  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword as string & tags.Format<"password">,
    href,
    referrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerA);

  // 2. Register Customer B
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPassword: string = "Password123!";
  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword as string & tags.Format<"password">,
    href,
    referrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerB);

  // 3. Register Seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = "Password123!";
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 4. Register Admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Password123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    href,
    referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 5. As Admin, create country and region
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const countryBody = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBodyBase = typia.random<IShoppingMallRegion.ICreate>();
  const regionBody: IShoppingMallRegion.ICreate = {
    code: regionBodyBase.code,
    name_en: regionBodyBase.name_en,
    region_type: regionBodyBase.region_type,
    is_active: regionBodyBase.is_active,
    sort_order: regionBodyBase.sort_order,
  };
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 6. As Customer A, create address
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAEmail,
      password: customerAPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const addressA: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerA.id,
        body: addressCreateBody,
      },
    );
  typia.assert(addressA);

  // 7. As Admin, create SKU inventory state
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const skuInventoryStateBody =
    typia.random<IShoppingMallSkuInventoryState.ICreate>();
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 8. As Seller, create product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBody = typia.random<IShoppingMallProduct.ICreate>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const skuBodyBase = typia.random<IShoppingMallSku.ICreate>();
  const skuBody: IShoppingMallSku.ICreate = {
    code: skuBodyBase.code,
    barcode: skuBodyBase.barcode,
    status: skuBodyBase.status,
    price: skuBodyBase.price,
    original_price: skuBodyBase.original_price ?? null,
    inventory_quantity: skuBodyBase.inventory_quantity,
    low_stock_threshold: skuBodyBase.low_stock_threshold ?? null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: skuBodyBase.attribute_value_ids,
    external_ids: skuBodyBase.external_ids,
  };
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 9. As Admin, create shipping method and payment method
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const shippingMethodBody =
    typia.random<IShoppingMallShippingMethod.ICreate>();
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = typia.random<IShoppingMallPaymentMethod.ICreate>();
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 10. As Customer A, create cart and order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAEmail,
      password: customerAPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartBody = typia.random<IShoppingMallCart.ICreate>();
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  const orderBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: addressA.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(orderA);

  // 11. As Customer A, create shipping address snapshot for order
  const orderShippingAddressBody: IShoppingMallOrderShippingAddress.ICreate = {
    recipient_name: addressA.recipient_name,
    line1: addressA.line1,
    line2: addressA.line2 ?? null,
    city: addressA.city,
    postal_code: addressA.postal_code,
    country_code: country.country_code,
    region: null,
    phone_number: addressA.phone_number ?? null,
  };
  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: orderA.order_code,
        body: orderShippingAddressBody,
      },
    );
  typia.assert(orderShippingAddress);

  // 12. As Admin, create a shipment for the order
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const shipmentItemBody: IShoppingMallShipmentItem.ICreate = {
    shopping_mall_order_item_id: orderA.items[0]!.id,
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const shipmentCreateBody: IShoppingMallShipment.ICreate = {
    orderCode: undefined,
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "shipped",
    carrierName: RandomGenerator.name(1),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    expectedShipDate: new Date().toISOString(),
    shipmentItems: [shipmentItemBody],
  };
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: orderA.order_code,
        body: shipmentCreateBody,
      },
    );
  typia.assert(shipment);

  // 13. As Customer A, verify they can list their shipments
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAEmail,
      password: customerAPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const listRequestA: IShoppingMallShipment.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
    shipment_code: undefined,
    shipping_statuses: undefined,
    carrier_name: undefined,
    tracking_number: undefined,
    created_from: undefined,
    created_to: undefined,
    shipped_from: undefined,
    shipped_to: undefined,
    delivered_from: undefined,
    delivered_to: undefined,
  };
  const pageA: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderCode: orderA.order_code,
        body: listRequestA,
      },
    );
  typia.assert(pageA);
  TestValidator.predicate(
    "customer A should see at least one shipment for their order",
    pageA.pagination.records >= 1,
  );

  // 14. As Customer B, attempt to list shipments for Customer A's order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBEmail,
      password: customerBPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const listRequestB: IShoppingMallShipment.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
    shipment_code: undefined,
    shipping_statuses: undefined,
    carrier_name: undefined,
    tracking_number: undefined,
    created_from: undefined,
    created_to: undefined,
    shipped_from: undefined,
    shipped_to: undefined,
    delivered_from: undefined,
    delivered_to: undefined,
  };

  await TestValidator.error(
    "customer B must not list shipments for customer A order",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.index(
        connection,
        {
          orderCode: orderA.order_code,
          body: listRequestB,
        },
      );
    },
  );

  // 15. Create separate order and shipment for Customer B and verify listing
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBEmail,
      password: customerBPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const addressBCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const addressB: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerB.id,
        body: addressBCreateBody,
      },
    );
  typia.assert(addressB);

  const cartBBody = typia.random<IShoppingMallCart.ICreate>();
  const cartB: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBBody,
    });
  typia.assert(cartB);

  const orderBBody: IShoppingMallOrder.ICreate = {
    cart_id: cartB.id,
    currency_code: cartB.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: addressB.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };
  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBBody,
    });
  typia.assert(orderB);

  const orderBShippingBody: IShoppingMallOrderShippingAddress.ICreate = {
    recipient_name: addressB.recipient_name,
    line1: addressB.line1,
    line2: addressB.line2 ?? null,
    city: addressB.city,
    postal_code: addressB.postal_code,
    country_code: country.country_code,
    region: null,
    phone_number: addressB.phone_number ?? null,
  };
  const orderBShipping: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: orderB.order_code,
        body: orderBShippingBody,
      },
    );
  typia.assert(orderBShipping);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const shipmentItemBBody: IShoppingMallShipmentItem.ICreate = {
    shopping_mall_order_item_id: orderB.items[0]!.id,
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const shipmentBCreateBody: IShoppingMallShipment.ICreate = {
    orderCode: undefined,
    shippingAddressId: orderBShipping.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "shipped",
    carrierName: RandomGenerator.name(1),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    expectedShipDate: new Date().toISOString(),
    shipmentItems: [shipmentItemBBody],
  };
  const shipmentB: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: orderB.order_code,
        body: shipmentBCreateBody,
      },
    );
  typia.assert(shipmentB);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBEmail,
      password: customerBPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const listRequestBOwn: IShoppingMallShipment.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
    shipment_code: undefined,
    shipping_statuses: undefined,
    carrier_name: undefined,
    tracking_number: undefined,
    created_from: undefined,
    created_to: undefined,
    shipped_from: undefined,
    shipped_to: undefined,
    delivered_from: undefined,
    delivered_to: undefined,
  };
  const pageBOwn: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderCode: orderB.order_code,
        body: listRequestBOwn,
      },
    );
  typia.assert(pageBOwn);
  TestValidator.predicate(
    "customer B should see at least one shipment for their own order",
    pageBOwn.pagination.records >= 1,
  );
}
