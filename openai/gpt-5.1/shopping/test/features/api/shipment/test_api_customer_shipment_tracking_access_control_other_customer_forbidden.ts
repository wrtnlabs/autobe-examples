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
import type { IShoppingMallShipmentEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentEvent";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";
import type { IShoppingMallShipmentTrackingShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingShippingAddress";
import type { IShoppingMallShipmentTrackingShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingShippingMethod";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_customer_shipment_tracking_access_control_other_customer_forbidden(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer A/B registration and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassw0rd!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassw0rd!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassw0rd!" as string & tags.Format<"password">,
      ip: null,
      href: "https://seller.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassw0rd!",
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      password: "CustomerAPassw0rd!" as string & tags.Format<"password">,
      ip: null,
      href: "https://shop.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAJoin);

  const customerALogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAEmail,
      password: "CustomerAPassw0rd!",
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerALogin);

  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: "CustomerBPassw0rd!" as string & tags.Format<"password">,
      ip: null,
      href: "https://shop.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBJoin);

  // 2. As admin: create country, region, category, sku inventory state, shipping method, payment method
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: "US",
        name_en: "United States",
        phone_code: "+1",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: "CA",
          name_en: "California",
          region_type: "state",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
        name_en: "Electronics",
        description_en: "Electronic devices",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
          name: "In stock",
          description: "Available for sale",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: `standard_${RandomGenerator.alphaNumeric(4)}`,
        display_name: "Standard Shipping",
        service_level_description: "3-5 business days",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: `card_${RandomGenerator.alphaNumeric(4)}`,
        display_name: "Credit Card",
        description: "Pay with credit card",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. As seller: create product and SKU
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: `SKU-PROD-${RandomGenerator.alphaNumeric(6)}`,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        brand: "AutoBE",
        model_name: "ModelX",
        status: "active",
        primary_image_uri: "https://cdn.example.com/image.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  const productCategoryLink =
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
  typia.assert<IShoppingMallProductCategory>(productCategoryLink);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100 as number & tags.Minimum<0>,
        original_price: null,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: skuInventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 4. As customer A: create cart, address, and order
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert<IShoppingMallCart>(cart);

  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerALogin.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: "123 Main St",
          line2: "Suite 100",
          city: "San Francisco",
          postal_code: "94105",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: null,
        currency_code: "USD",
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32">,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address_id: customerAddress.id,
        shipping_address_snapshot: null,
        shipping_method_id: null,
        payment_method_id: null,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  const shippingAddressSnapshot =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: {
          recipient_name: customerAddress.recipient_name,
          line1: customerAddress.line1,
          line2: customerAddress.line2 ?? null,
          city: customerAddress.city,
          postal_code: customerAddress.postal_code,
          country_code: country.country_code as string &
            tags.MinLength<2> &
            tags.MaxLength<2>,
          region: "CA",
          phone_number: customerAddress.phone_number ?? null,
        } satisfies IShoppingMallOrderShippingAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallOrderShippingAddress>(shippingAddressSnapshot);

  // 5. As admin: create shipment and events for Customer A's order
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: order.order_code,
        body: {
          shippingAddressId: shippingAddressSnapshot.id,
          shippingMethodId: shippingMethod.id,
          shippingStatus: "shipped",
          carrierName: "DHL",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          expectedShipDate: new Date().toISOString() as string &
            tags.Format<"date-time">,
          shipmentItems: [
            {
              shopping_mall_order_item_id: order.items[0].id,
              shopping_mall_sku_id: sku.id,
              quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            } satisfies IShoppingMallShipmentItem.ICreate,
          ],
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert<IShoppingMallShipment>(shipment);

  const shipmentEvent =
    await api.functional.shoppingMall.shipments.events.create(connection, {
      shipmentCode: shipment.shipment_code,
      body: {
        event_type: "status_change",
        status: "in_transit",
        description: "Package departed facility",
        event_time: new Date().toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IShoppingMallShipmentEvent.ICreate,
    });
  typia.assert<IShoppingMallShipmentEvent>(shipmentEvent);

  const shipmentCodeA: string = shipment.shipment_code;

  // 6. Positive control: Customer A can see tracking for their shipment
  const trackingForA =
    await api.functional.shoppingMall.customer.shipments.tracking.at(
      connection,
      {
        shipmentCode: shipmentCodeA,
      },
    );
  typia.assert<IShoppingMallShipmentTracking>(trackingForA);

  TestValidator.predicate(
    "tracking for owner has at least one event",
    trackingForA.events.length >= 1,
  );
  TestValidator.equals(
    "shipping method id in tracking matches created shipping method",
    trackingForA.shippingMethod.id,
    shippingMethod.id,
  );

  // 7. As Customer B: attempt to access tracking for Customer A's shipment
  const customerBLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBEmail,
      password: "CustomerBPassw0rd!",
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBLogin);

  await TestValidator.error(
    "other customer cannot access tracking for shipment they do not own",
    async () => {
      await api.functional.shoppingMall.customer.shipments.tracking.at(
        connection,
        {
          shipmentCode: shipmentCodeA,
        },
      );
    },
  );
}
