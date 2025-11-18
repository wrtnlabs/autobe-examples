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

export async function test_api_admin_order_price_snapshot_retrieval_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Admin join (will be used to create configuration and snapshots)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin1234!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Customer join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "Customer1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Seller join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Admin: create country
  const countryCode = "KR";
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 5. Admin: create region under country
  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 6. Admin: create shipping method
  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping method for tests",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 7. Admin: create payment method
  const paymentMethodCreateBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Test card payment",
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

  // 8. Admin: create category
  const categoryCreateBody = {
    parent_id: null,
    slug: "test-category",
    name_en: "Test Category",
    description_en: "Category for E2E price snapshot tests",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 9. Admin: create SKU inventory state
  const skuInventoryStateCreateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Inventory available",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 10. Seller: login and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Seller1234!",
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: "E2E Snapshot Test Product",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 11. Admin: link product to category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Admin1234!",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

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

  // 12. Seller: login again and create SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Seller1234!",
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 10000,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 13. Customer: login and create address, cart, cart item, and order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "Customer1234!",
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/login",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "E2E Customer",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
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

  // 14. Admin: login and create price snapshot for the order
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Admin1234!",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const snapshotCreateBody = {
    item_subtotal_amount: 10000,
    item_discount_amount: 0,
    order_discount_amount: 0,
    shipping_fee_amount: 0,
    payment_surcharge_amount: 0,
    tax_amount: 0,
    grand_total_amount: 10000,
    is_final: true,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;
  const createdSnapshot: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.create(
      connection,
      {
        orderCode: order.order_code,
        body: snapshotCreateBody,
      },
    );
  typia.assert(createdSnapshot);

  // 15. Unauthenticated access: use a fresh connection without Authorization
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to admin price snapshot must fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.priceSnapshots.at(
        unauthenticated,
        {
          orderCode: order.order_code,
          snapshotId: createdSnapshot.id,
        },
      );
    },
  );

  // 16. Customer-authenticated access should be forbidden
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "Customer1234!",
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/login",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  await TestValidator.error(
    "customer must not access admin order price snapshot",
    async () => {
      await api.functional.shoppingMall.admin.orders.priceSnapshots.at(
        connection,
        {
          orderCode: order.order_code,
          snapshotId: createdSnapshot.id,
        },
      );
    },
  );

  // 17. Seller-authenticated access should be forbidden
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Seller1234!",
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  await TestValidator.error(
    "seller must not access admin order price snapshot",
    async () => {
      await api.functional.shoppingMall.admin.orders.priceSnapshots.at(
        connection,
        {
          orderCode: order.order_code,
          snapshotId: createdSnapshot.id,
        },
      );
    },
  );

  // 18. Admin-authenticated access must succeed
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Admin1234!",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const fetchedSnapshot: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.at(
      connection,
      {
        orderCode: order.order_code,
        snapshotId: createdSnapshot.id,
      },
    );
  typia.assert(fetchedSnapshot);

  // 19. Basic consistency checks on the fetched snapshot
  TestValidator.equals(
    "snapshot id from GET must match created snapshot id",
    fetchedSnapshot.id,
    createdSnapshot.id,
  );
  TestValidator.equals(
    "is_final flag must be preserved in GET response",
    fetchedSnapshot.is_final,
    createdSnapshot.is_final,
  );
  TestValidator.predicate(
    "grand_total_amount must be non-negative",
    fetchedSnapshot.grand_total_amount >= 0,
  );
}
