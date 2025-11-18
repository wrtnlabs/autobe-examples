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

export async function test_api_customer_order_shipments_list_multiple_shipments_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin, seller, and customer registrations
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const baseHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const baseReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // Join customer
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  // Join seller
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // Join admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // Helper to login as specific actor when needed
  const loginCustomer = async () => {
    const authorized = await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
    typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);
    return authorized;
  };

  const loginSeller = async () => {
    const authorized = await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
    typia.assert<IShoppingMallSeller.IAuthorized>(authorized);
    return authorized;
  };

  const loginAdmin = async () => {
    const authorized = await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
    typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);
    return authorized;
  };

  // 2. Admin: create SKU inventory state, country, region, shipping + payment methods
  await loginAdmin();

  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "In stock and purchasable",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  const countryCreate =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: "US",
        name_en: "United States",
        phone_code: "+1",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert<IShoppingMallCountry>(countryCreate);

  const regionCreate =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCreate.country_code,
        body: {
          code: "CA",
          name_en: "California",
          region_type: "state",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(regionCreate);

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "standard",
        display_name: "Standard Shipping",
        service_level_description: "3-5 business days",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card",
        display_name: "Credit Card",
        description: "Generic card payment",
        provider_type: "card_processor",
        allowed_currencies: "USD",
        allowed_countries: "US",
        min_amount: 0,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. Seller: create product and SKU
  await loginSeller();

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "TestBrand",
        model_name: "Model-1",
        status: "active",
        primary_image_uri: typia.random<string & tags.Format<"uri">>(),
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        code: RandomGenerator.alphaNumeric(8) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: null,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: undefined,
        external_ids: undefined,
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 4. Customer: login, create address, cart, and order
  const customerAuth = await loginCustomer();

  const address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: {
          shopping_mall_country_id: countryCreate.id,
          shopping_mall_region_id: regionCreate.id,
          recipient_name: RandomGenerator.name(2),
          line1: "123 Test Street",
          line2: null,
          city: "Test City",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

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

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: null,
        currency_code: "USD",
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 2 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: address.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: "Please ship quickly",
        platform_note: "Test order for shipments pagination",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  // 5. Customer: create shipping address snapshot for the order
  const orderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: {
          recipient_name: RandomGenerator.name(2),
          line1: "123 Test Street",
          line2: null,
          city: "Test City",
          postal_code: "12345",
          country_code: countryCreate.country_code as string &
            tags.MinLength<2> &
            tags.MaxLength<2>,
          region: regionCreate.name_en,
          phone_number: RandomGenerator.mobile(),
        } satisfies IShoppingMallOrderShippingAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallOrderShippingAddress>(orderShippingAddress);

  // 6. Admin: create two shipments for the order
  await loginAdmin();

  const shipmentItemCreateBase: IShoppingMallShipmentItem.ICreate = {
    shopping_mall_order_item_id: order.items[0].id,
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallShipmentItem.ICreate;

  const expectedShipDate1: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();
  const expectedShipDate2: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const shipment1 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: order.order_code,
        body: {
          orderCode: undefined,
          shippingAddressId: orderShippingAddress.id,
          shippingMethodId: shippingMethod.id,
          shippingStatus: "pending",
          carrierName: "Carrier A",
          trackingNumber: "TRACK-1",
          expectedShipDate: expectedShipDate1,
          shipmentItems: [shipmentItemCreateBase],
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert<IShoppingMallShipment>(shipment1);

  const shipment2 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: order.order_code,
        body: {
          orderCode: undefined,
          shippingAddressId: orderShippingAddress.id,
          shippingMethodId: shippingMethod.id,
          shippingStatus: "pending",
          carrierName: "Carrier B",
          trackingNumber: "TRACK-2",
          expectedShipDate: expectedShipDate2,
          shipmentItems: [shipmentItemCreateBase],
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert<IShoppingMallShipment>(shipment2);

  // Determine which shipment is newer by created_at
  const newerShipment =
    shipment1.created_at >= shipment2.created_at ? shipment1 : shipment2;
  const olderShipment = newerShipment === shipment1 ? shipment2 : shipment1;

  // 7. Customer: list shipments with pagination, page=1, limit=1, sort by created_at desc
  await loginCustomer();

  const firstPage =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderCode: order.order_code,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 1 as number & tags.Type<"int32">,
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
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallShipment.ISummary>(firstPage);

  const firstPagePagination = firstPage.pagination;
  TestValidator.equals(
    "first page: limit is 1",
    firstPagePagination.limit,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "first page: current is 1",
    firstPagePagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "first page: records >= 2",
    firstPagePagination.records >= 2,
  );
  TestValidator.predicate(
    "first page: pages >= 2",
    firstPagePagination.pages >= 2,
  );
  TestValidator.equals(
    "first page: data length is 1",
    firstPage.data.length,
    1,
  );

  const firstShipmentSummary = firstPage.data[0];
  TestValidator.equals(
    "first page: newest shipment is returned",
    firstShipmentSummary.id,
    newerShipment.id,
  );

  // 8. page=2, limit=1
  const secondPage =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderCode: order.order_code,
        body: {
          page: 2 as number & tags.Type<"int32">,
          limit: 1 as number & tags.Type<"int32">,
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
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallShipment.ISummary>(secondPage);

  const secondPagePagination = secondPage.pagination;
  TestValidator.equals(
    "second page: limit is 1",
    secondPagePagination.limit,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "second page: current is 2",
    secondPagePagination.current,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "second page: records >= 2",
    secondPagePagination.records >= 2,
  );
  TestValidator.predicate(
    "second page: pages >= 2",
    secondPagePagination.pages >= 2,
  );
  TestValidator.equals(
    "second page: data length is 1",
    secondPage.data.length,
    1,
  );

  const secondShipmentSummary = secondPage.data[0];
  TestValidator.equals(
    "second page: older shipment is returned",
    secondShipmentSummary.id,
    olderShipment.id,
  );

  // 9. Optional: request page beyond available pages, expect empty data
  if (firstPagePagination.pages > 2) {
    const beyondPageIndex = firstPagePagination.pages + 1;
    const beyondPage =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        connection,
        {
          orderCode: order.order_code,
          body: {
            page: beyondPageIndex as number & tags.Type<"int32">,
            limit: 1 as number & tags.Type<"int32">,
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
          } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert<IPageIShoppingMallShipment.ISummary>(beyondPage);

    TestValidator.equals(
      "beyond page: current equals requested",
      beyondPage.pagination.current,
      beyondPageIndex,
    );
    TestValidator.equals(
      "beyond page: limit unchanged",
      beyondPage.pagination.limit,
      1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    );
    TestValidator.equals(
      "beyond page: records unchanged",
      beyondPage.pagination.records,
      firstPagePagination.records,
    );
    TestValidator.equals(
      "beyond page: pages unchanged",
      beyondPage.pagination.pages,
      firstPagePagination.pages,
    );
    TestValidator.equals(
      "beyond page: data is empty",
      beyondPage.data.length,
      0,
    );
  }
}
