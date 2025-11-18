import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
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
import type { IShoppingMallOrderItemSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSeller";
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

export async function test_api_admin_order_item_seller_get_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Create distinct emails for customer, seller, and admin
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const href: string = "https://example.com/join";
  const referrer: string = "https://example.com/landing";

  // 2. Customer join (also authenticates as customer)
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Seller join (also authenticates as seller)
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Admin join (also authenticates as admin)
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Helper to clone connection without headers (unauthenticated baseline)
  const baseConnection: api.IConnection = { ...connection, headers: {} };

  // 5. As admin: create country
  await api.functional.auth.admin.login(baseConnection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  const adminConn: api.IConnection = { ...baseConnection };

  const countryCode: string = RandomGenerator.alphaNumeric(3).toUpperCase();
  const country = await api.functional.shoppingMall.admin.countries.create(
    adminConn,
    {
      body: {
        country_code: countryCode,
        name_en: "Testland",
        phone_code: "+99",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert(country);

  // 6. As admin: create region under the country
  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      adminConn,
      {
        countryCode,
        body: {
          code: "TL-01",
          name_en: "Test Region",
          region_type: "state",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  // 7. As admin: create category
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConn,
    {
      body: {
        parent_id: null,
        slug: `test-category-${RandomGenerator.alphaNumeric(6)}`,
        name_en: "Test Category",
        description_en: null,
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 8. As admin: create SKU inventory state
  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      adminConn,
      {
        body: {
          code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
          name: "In Stock",
          description: "Purchasable test state",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(skuInventoryState);

  // 9. As admin: create shipping method
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(adminConn, {
      body: {
        method_code: `standard_${RandomGenerator.alphaNumeric(4)}`,
        display_name: "Standard Shipping",
        service_level_description: "Standard test shipping method",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  // 10. As admin: create payment method
  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(adminConn, {
      body: {
        code: `card_${RandomGenerator.alphaNumeric(4)}`,
        display_name: "Test Card",
        description: null,
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 11. As seller: login and create product
  await api.functional.auth.seller.login(baseConnection, {
    body: {
      email: sellerEmail,
      password: sellerJoinBody.password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  const sellerConn: api.IConnection = { ...baseConnection };

  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConn,
    {
      body: {
        code: `P-${RandomGenerator.alphaNumeric(6)}`,
        title: "Test Product",
        summary: "Test product summary",
        description: "Detailed description for test product",
        brand: "TestBrand",
        model_name: "Model X",
        status: "active",
        primary_image_uri: "https://example.com/image.png",
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 12. As admin: link product to category
  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      adminConn,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // 13. As seller: create SKU for product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    sellerConn,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: null,
        inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: skuInventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // 14. As customer: login and create address
  await api.functional.auth.customer.login(baseConnection, {
    body: {
      email: customerEmail,
      password: customerJoinBody.password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  const customerConn: api.IConnection = { ...baseConnection };

  const address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      customerConn,
      {
        customerId: customerAuthorized.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: "Test Customer",
          line1: "123 Test Street",
          line2: null,
          city: "Test City",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 15. As customer: create cart and add item
  const cart = await api.functional.shoppingMall.customer.carts.create(
    customerConn,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConn,
      {
        cartId: cart.id,
        body: {
          shopping_mall_sku_id: sku.id,
          quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 16. As customer: create order from cart
  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: "Test Customer",
      phone_number: RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: address.postal_code,
      state_or_region: region.name_en,
      city: address.city,
      address_line1: address.line1,
      address_line2: address.line2 ?? null,
    };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConn,
    {
      body: orderCreateBody,
    },
  );
  typia.assert(order);

  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );

  const firstOrderItem: IShoppingMallOrderItem = order.items[0];

  // 17. As customer: create payment for the order
  const paymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const orderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      customerConn,
      {
        orderId: order.id,
        body: paymentBody,
      },
    );
  typia.assert(orderPayment);

  // 18. As admin: search orders to resolve orderCode and confirm mapping exists
  await api.functional.auth.admin.login(baseConnection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  const adminConn2: api.IConnection = { ...baseConnection };

  const page = await api.functional.shoppingMall.admin.orders.index(
    adminConn2,
    {
      body: {
        page: 0 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
        orderCode: order.order_code,
        customerKeyword: undefined,
        sellerId: undefined,
        statusIn: undefined,
        minGrandTotalAmount: undefined,
        maxGrandTotalAmount: undefined,
        placedAtFrom: undefined,
        placedAtTo: undefined,
        includeCancelled: undefined,
        includeFullyRefunded: undefined,
        sortField: undefined,
        sortDirection: undefined,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page);

  TestValidator.predicate(
    "admin search returns at least one order",
    page.data.length > 0,
  );

  const summaryOrder = page.data[0];
  TestValidator.equals(
    "summary order id matches created order",
    summaryOrder.id,
    order.id,
  );

  // 19. As admin: ensure we can retrieve seller mapping successfully
  const mapping: IShoppingMallOrderItemSeller =
    await api.functional.shoppingMall.admin.orders.items.seller.at(adminConn2, {
      orderCode: summaryOrder.order_code,
      orderItemId: firstOrderItem.id,
    });
  typia.assert(mapping);

  TestValidator.equals(
    "mapping order item id matches",
    mapping.shopping_mall_order_item_id,
    firstOrderItem.id,
  );

  // 20. As customer: attempt to access admin seller mapping endpoint (should error)
  await api.functional.auth.customer.login(baseConnection, {
    body: {
      email: customerEmail,
      password: customerJoinBody.password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });
  const customerConn2: api.IConnection = { ...baseConnection };

  await TestValidator.error(
    "customer access to admin order item seller mapping is forbidden",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.seller.at(
        customerConn2,
        {
          orderCode: summaryOrder.order_code,
          orderItemId: firstOrderItem.id,
        },
      );
    },
  );

  // 21. As seller: attempt to access admin seller mapping endpoint (should error)
  await api.functional.auth.seller.login(baseConnection, {
    body: {
      email: sellerEmail,
      password: sellerJoinBody.password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  const sellerConn2: api.IConnection = { ...baseConnection };

  await TestValidator.error(
    "seller access to admin order item seller mapping is forbidden",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.seller.at(
        sellerConn2,
        {
          orderCode: summaryOrder.order_code,
          orderItemId: firstOrderItem.id,
        },
      );
    },
  );

  // 22. As admin again: confirm authorized access still works
  await api.functional.auth.admin.login(baseConnection, {
    body: {
      email: adminEmail,
      password: adminJoinBody.password,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  const adminConn3: api.IConnection = { ...baseConnection };

  const mappingAgain: IShoppingMallOrderItemSeller =
    await api.functional.shoppingMall.admin.orders.items.seller.at(adminConn3, {
      orderCode: summaryOrder.order_code,
      orderItemId: firstOrderItem.id,
    });
  typia.assert(mappingAgain);

  TestValidator.equals(
    "authorized admin still sees same seller mapping",
    mappingAgain.shopping_mall_order_item_id,
    mapping.shopping_mall_order_item_id,
  );
}
