import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPriceSnapshot";
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

export async function test_api_order_price_snapshots_list_for_customer_order(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 2. Admin creates country and region
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(2),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: countryCreateBody,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  const regionCode = RandomGenerator.alphabets(4).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.name(1),
    region_type: "state",
    is_active: true,
    sort_order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 3. Admin creates category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(8),
    name_en: RandomGenerator.name(2),
    description_en: null,
    status: "active",
    sort_order: 1 satisfies number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryCreateBody,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 4. Seller join & login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 5. Seller creates product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 6. Admin links product to category (switch to admin)
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgain);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 7. Admin creates SKU inventory state
  const inventoryStateCode = RandomGenerator.alphabets(6);
  const skuInventoryStateCreateBody = {
    code: inventoryStateCode,
    name: "In Stock",
    description: null,
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 8. Seller creates SKU for product (switch back to seller)
  const sellerLoginAgain = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    low_stock_threshold: 1 satisfies
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 9. Customer join & login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  const customerId = customerLogin.id;

  // 10. Customer creates shipping address
  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: customerAddressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 11. Customer creates cart
  const currencyCode = "USD";
  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: currencyCode,
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: cartCreateBody,
    },
  );
  typia.assert<IShoppingMallCart>(cart);

  // 12. Customer adds SKU to cart
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // 13. Admin creates shipping method and payment method
  const adminLoginForConfig = await api.functional.auth.admin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForConfig);

  const shippingMethodCode = "standard" + RandomGenerator.alphaNumeric(4);
  const shippingMethodCreateBody = {
    method_code: shippingMethodCode,
    display_name: "Standard Shipping",
    service_level_description: null,
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCode = "card" + RandomGenerator.alphaNumeric(4);
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Credit Card",
    description: null,
    provider_type: "card_processor",
    allowed_currencies: currencyCode,
    allowed_countries: country.country_code,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 14. Customer creates order referencing cart and address (switch back to customer)
  const customerLoginForOrder = await api.functional.auth.customer.login(
    connection,
    {
      body: customerLoginBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoginForOrder);

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: currencyCode,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 satisfies number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  TestValidator.predicate(
    "order should contain exactly one item with quantity 1",
    order.items.length === 1 && order.items[0]?.quantity === 1,
  );

  const orderCode = order.order_code;

  // 15. Admin creates price snapshots for the order
  const adminLoginForSnapshots = await api.functional.auth.admin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForSnapshots);

  const snapshot1CreateBody = {
    item_subtotal_amount: 100,
    item_discount_amount: 10,
    order_discount_amount: 5,
    shipping_fee_amount: 3,
    payment_surcharge_amount: 2,
    tax_amount: 1,
    grand_total_amount: 91,
    is_final: false,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;
  const snapshot1 =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.create(
      connection,
      {
        orderCode,
        body: snapshot1CreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPriceSnapshot>(snapshot1);

  const snapshot2CreateBody = {
    item_subtotal_amount: 100,
    item_discount_amount: 15,
    order_discount_amount: 0,
    shipping_fee_amount: 3,
    payment_surcharge_amount: 2,
    tax_amount: 1,
    grand_total_amount: 91,
    is_final: true,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;
  const snapshot2 =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.create(
      connection,
      {
        orderCode,
        body: snapshot2CreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPriceSnapshot>(snapshot2);

  TestValidator.predicate(
    "at least one created snapshot should be final",
    snapshot1.is_final === true || snapshot2.is_final === true,
  );

  // 16. Customer lists price snapshots (basic listing)
  const customerLoginForListing = await api.functional.auth.customer.login(
    connection,
    {
      body: customerLoginBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoginForListing);

  const listRequestBody: IShoppingMallOrderPriceSnapshot.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    fromCreatedAt: null,
    toCreatedAt: null,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallOrderPriceSnapshot.IRequest;

  const listResponse =
    await api.functional.shoppingMall.orders.priceSnapshots.index(connection, {
      orderCode,
      body: listRequestBody,
    });
  typia.assert<IPageIShoppingMallOrderPriceSnapshot.ISummary>(listResponse);

  const pageInfo = listResponse.pagination;
  TestValidator.predicate(
    "pagination should report at least 2 records",
    pageInfo.records >= 2,
  );

  const snapshotSummaries = listResponse.data;
  TestValidator.predicate(
    "price snapshot listing should contain at least 2 snapshots",
    snapshotSummaries.length >= 2,
  );

  const found1 = snapshotSummaries.find((s) => s.id === snapshot1.id);
  const found2 = snapshotSummaries.find((s) => s.id === snapshot2.id);

  TestValidator.predicate(
    "both created snapshots should be present in listing",
    !!found1 && !!found2,
  );

  if (found1) {
    TestValidator.equals(
      "snapshot1 item_subtotal_amount should match",
      found1.item_subtotal_amount,
      snapshot1.item_subtotal_amount,
    );
    TestValidator.equals(
      "snapshot1 item_discount_amount should match",
      found1.item_discount_amount,
      snapshot1.item_discount_amount,
    );
    TestValidator.equals(
      "snapshot1 order_discount_amount should match",
      found1.order_discount_amount,
      snapshot1.order_discount_amount,
    );
    TestValidator.equals(
      "snapshot1 shipping_fee_amount should match",
      found1.shipping_fee_amount,
      snapshot1.shipping_fee_amount,
    );
    TestValidator.equals(
      "snapshot1 payment_surcharge_amount should match",
      found1.payment_surcharge_amount,
      snapshot1.payment_surcharge_amount,
    );
    TestValidator.equals(
      "snapshot1 tax_amount should match",
      found1.tax_amount,
      snapshot1.tax_amount,
    );
    TestValidator.equals(
      "snapshot1 grand_total_amount should match",
      found1.grand_total_amount,
      snapshot1.grand_total_amount,
    );
    TestValidator.equals(
      "snapshot1 is_final should match",
      found1.is_final,
      snapshot1.is_final,
    );
  }

  if (found2) {
    TestValidator.equals(
      "snapshot2 item_subtotal_amount should match",
      found2.item_subtotal_amount,
      snapshot2.item_subtotal_amount,
    );
    TestValidator.equals(
      "snapshot2 item_discount_amount should match",
      found2.item_discount_amount,
      snapshot2.item_discount_amount,
    );
    TestValidator.equals(
      "snapshot2 order_discount_amount should match",
      found2.order_discount_amount,
      snapshot2.order_discount_amount,
    );
    TestValidator.equals(
      "snapshot2 shipping_fee_amount should match",
      found2.shipping_fee_amount,
      snapshot2.shipping_fee_amount,
    );
    TestValidator.equals(
      "snapshot2 payment_surcharge_amount should match",
      found2.payment_surcharge_amount,
      snapshot2.payment_surcharge_amount,
    );
    TestValidator.equals(
      "snapshot2 tax_amount should match",
      found2.tax_amount,
      snapshot2.tax_amount,
    );
    TestValidator.equals(
      "snapshot2 grand_total_amount should match",
      found2.grand_total_amount,
      snapshot2.grand_total_amount,
    );
    TestValidator.equals(
      "snapshot2 is_final should match",
      found2.is_final,
      snapshot2.is_final,
    );
  }

  TestValidator.predicate(
    "listing should include at least one final snapshot",
    snapshotSummaries.some((s) => s.is_final === true),
  );

  // 17. Time-range filter behavior using snapshot2.created_at
  const windowTimestamp = snapshot2.created_at;

  const timeFilteredRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    fromCreatedAt: windowTimestamp,
    toCreatedAt: windowTimestamp,
    sortBy: "created_at",
    sortDirection: "asc",
  } satisfies IShoppingMallOrderPriceSnapshot.IRequest;

  const timeFilteredResponse =
    await api.functional.shoppingMall.orders.priceSnapshots.index(connection, {
      orderCode,
      body: timeFilteredRequestBody,
    });
  typia.assert<IPageIShoppingMallOrderPriceSnapshot.ISummary>(
    timeFilteredResponse,
  );

  const timeFilteredSnapshots = timeFilteredResponse.data;
  TestValidator.predicate(
    "time-filtered listing should include snapshot2",
    timeFilteredSnapshots.some((s) => s.id === snapshot2.id),
  );

  // 18. Sorting behavior by created_at asc
  const sortedRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    fromCreatedAt: null,
    toCreatedAt: null,
    sortBy: "created_at",
    sortDirection: "asc",
  } satisfies IShoppingMallOrderPriceSnapshot.IRequest;

  const sortedResponse =
    await api.functional.shoppingMall.orders.priceSnapshots.index(connection, {
      orderCode,
      body: sortedRequestBody,
    });
  typia.assert<IPageIShoppingMallOrderPriceSnapshot.ISummary>(sortedResponse);

  const sortedSnapshots = sortedResponse.data;
  if (sortedSnapshots.length >= 2) {
    const first = sortedSnapshots[0];
    const second = sortedSnapshots[1];
    TestValidator.predicate(
      "snapshots should be sorted ascending by created_at",
      first.created_at <= second.created_at,
    );
  }

  // 19. Idempotent behavior check: repeat basic listing and compare ids set
  const listResponseAgain =
    await api.functional.shoppingMall.orders.priceSnapshots.index(connection, {
      orderCode,
      body: listRequestBody,
    });
  typia.assert<IPageIShoppingMallOrderPriceSnapshot.ISummary>(
    listResponseAgain,
  );

  const idsFirst = listResponse.data.map((s) => s.id).sort();
  const idsSecond = listResponseAgain.data.map((s) => s.id).sort();

  TestValidator.equals(
    "repeated listing should return same set of snapshot ids",
    idsFirst,
    idsSecond,
  );
}
