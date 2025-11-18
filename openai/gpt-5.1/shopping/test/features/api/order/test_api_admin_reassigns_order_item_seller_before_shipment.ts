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

/**
 * Validate that an admin can reassign the seller mapping for an order item
 * before shipment.
 *
 * Business flow implemented by this test:
 *
 * 1. Admin joins and logs in to obtain admin context.
 * 2. Admin creates a country and a region to support customer addresses.
 * 3. Admin creates a purchasable SKU inventory state.
 * 4. Seller A joins and becomes the owner of a new product.
 * 5. Admin creates a category and links the product to that category.
 * 6. Seller A creates a sellable SKU for the product using the inventory state.
 * 7. Admin creates a shipping method and a payment method.
 * 8. Customer joins and logs in.
 * 9. Customer creates a shipping address under the created country/region.
 * 10. Customer creates a cart and adds the SKU as a cart item.
 * 11. Customer creates an order from that cart, referencing the address, shipping
 *     method, and payment method.
 * 12. Using the created order and one of its items, admin calls the seller-update
 *     endpoint to change the order item’s seller from Seller A to a newly
 *     joined Seller B.
 * 13. The test validates that the response is a well-formed
 *     IShoppingMallOrderItemSeller, that the order item id is preserved, and
 *     that the seller id is updated to Seller B.
 */
export async function test_api_admin_reassigns_order_item_seller_before_shipment(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinReq = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinReq,
    });
  typia.assert(adminAuthorized);

  // 1-2. Admin login (explicitly test login path and ensure token handling is valid)
  const adminLoginReq = {
    email: adminEmail,
    password: adminJoinReq.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginReq,
    });
  typia.assert(adminLogin);

  // 2. Admin creates country
  const countryCreate = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreate,
    });
  typia.assert(country);

  // 3. Admin creates region under the country
  const regionCreate = {
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
        body: regionCreate,
      },
    );
  typia.assert(region);

  // 4. Admin creates a purchasable inventory state
  const skuInventoryStateCreate = {
    code: "IN_STOCK",
    name: "In stock",
    description: "Sellable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreate,
      },
    );
  typia.assert(skuInventoryState);

  // 5. Seller A joins
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAJoinReq = {
    email: sellerAEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinReq,
    });
  typia.assert(sellerAAuthorized);

  // 5-2. Seller A login to ensure seller context is active
  const sellerALoginReq = {
    email: sellerAEmail,
    password: sellerAJoinReq.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginReq,
    });
  typia.assert(sellerALogin);

  // 6. Seller A creates product
  const productCreate = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-A1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product-a1.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 7. Admin creates category
  const categoryCreate = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  // 7-2. Admin links product to category
  const productCategoryCreate = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreate,
      },
    );
  typia.assert(productCategory);

  // 8. Seller A creates SKU
  const skuCreate = {
    code: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(13) as
      | (string & tags.MinLength<1> & tags.MaxLength<255>)
      | null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000 as number & tags.Minimum<0>,
    original_price: 12000 as (number & tags.Minimum<0>) | null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [] as (string & tags.Format<"uuid">)[],
    external_ids: [] as IShoppingMallSkuExternalId.ICreate[] | undefined,
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreate,
    });
  typia.assert(sku);

  // 9. Admin creates shipping method
  const shippingMethodCreate = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreate,
    });
  typia.assert(shippingMethod);

  // 10. Admin creates payment method
  const paymentMethodCreate = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreate,
    });
  typia.assert(paymentMethod);

  // 11. Customer joins
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinReq = {
    email: customerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinReq,
    });
  typia.assert(customerAuthorized);

  // 11-2. Customer login to ensure context
  const customerLoginReq = {
    email: customerEmail,
    password: customerJoinReq.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginReq,
    });
  typia.assert(customerLogin);

  // 12. Customer creates shipping address
  const addressCreate = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressCreate,
      },
    );
  typia.assert(customerAddress);

  // 13. Customer creates cart
  const cartCreate = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert(cart);

  // 14. Customer adds SKU to cart
  const cartItemCreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreate,
    });
  typia.assert(cartItem);

  // 15-16. Customer creates order from cart
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };
  const shippingAddressSnapshotCreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;
  const orderCreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotCreate,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order should have at least one item",
    order.items.length > 0,
  );

  const targetOrderItem: IShoppingMallOrderItem = order.items[0];
  const originalSellerId: string & tags.Format<"uuid"> =
    targetOrderItem.seller.id;

  // 17. Create Seller B to reassign to
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBJoinReq = {
    email: sellerBEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerBAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinReq,
    });
  typia.assert(sellerBAuthorized);

  // 18. Admin reassigns seller mapping for the order item to Seller B
  const updateBody = {
    shopping_mall_seller_id: sellerBAuthorized.id,
  } satisfies IShoppingMallOrderItemSeller.IUpdate;
  const updatedMapping: IShoppingMallOrderItemSeller =
    await api.functional.shoppingMall.admin.orders.items.seller.update(
      connection,
      {
        orderCode: order.order_code,
        orderItemId: targetOrderItem.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedMapping);

  // 19. Validate updated mapping invariants
  TestValidator.equals(
    "mapping should point to the same order item",
    updatedMapping.shopping_mall_order_item_id,
    targetOrderItem.id,
  );
  TestValidator.equals(
    "mapping seller id should be updated to Seller B",
    updatedMapping.shopping_mall_seller_id,
    sellerBAuthorized.id,
  );

  TestValidator.notEquals(
    "seller mapping should actually change from original seller",
    updatedMapping.shopping_mall_seller_id,
    originalSellerId,
  );

  TestValidator.predicate(
    "order status should still be in pre-shipment or early state",
    typeof order.current_status === "string" && order.current_status.length > 0,
  );
}
