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

/**
 * Validate that a customer can clear optional fields on an order shipping
 * address snapshot.
 *
 * Business flow:
 *
 * 1. Admin joins and seeds country, region, SKU inventory state, category,
 *    shipping method, and payment method.
 * 2. Seller joins and creates a product and a SKU bound to the seeded inventory
 *    state.
 * 3. Customer joins and logs in.
 * 4. Customer creates a cart and adds the SKU as a line item.
 * 5. Customer creates an order from the cart using a saved customer address id,
 *    shipping method, and payment method, with `shipping_address_snapshot` set
 *    to null so it relies on the saved address reference.
 * 6. Customer attaches an initial shipping address snapshot via POST
 *    /shoppingMall/customer/orders/{orderCode}/shippingAddress with non-null
 *    values for line2, region, and phone_number.
 * 7. Customer calls PUT /shoppingMall/customer/orders/{orderCode}/shippingAddress
 *    with an IShoppingMallOrderShippingAddress.IUpdate body that omits
 *    recipient_name, line1, city, postal_code, and country_code, but sets
 *    line2, region, and phone_number explicitly to null.
 * 8. Validate that the updated snapshot keeps original values for all unchanged
 *    fields and sets the targeted optional fields (line2, region, phone_number)
 *    to null.
 */
export async function test_api_customer_update_shipping_address_to_clear_optional_fields(
  connection: api.IConnection,
) {
  // 1. Admin joins and seeds configuration (country, region, inventory state, category, shipping & payment methods)
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    password: "Admin123!",
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const countryCreate = {
    country_code: "ZZ",
    name_en: "Zedland",
    phone_code: "+999",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreate,
    });
  typia.assert(country);

  const regionCreate = {
    code: "ZED-REGION",
    name_en: "Zedland Central",
    region_type: "state",
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

  const inventoryStateCreate = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for immediate purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreate,
      },
    );
  typia.assert(inventoryState);

  const categoryCreate = {
    parent_id: null,
    slug: "test-category",
    name_en: "Test Category",
    description_en: "Category for E2E tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  const shippingMethodCreate = {
    method_code: "STD",
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreate,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreate = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Standard card payment",
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

  // 2. Seller joins and creates product + SKU
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.test`,
    password: "Seller123!",
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const productCreate = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "E2E Brand",
    model_name: "E2E Model",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/e2e-product.png" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

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

  const skuCreate = {
    code: RandomGenerator.alphaNumeric(6) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreate,
    });
  typia.assert(sku);

  // 3. Customer joins and logs in
  const customerEmail =
    `${RandomGenerator.alphaNumeric(8)}@customer.test` as string &
      tags.Format<"email">;
  const customerJoinBody = {
    email: customerEmail,
    password: "Customer123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: "Customer123!",
    ip: null,
    href: "https://shoppingmall.test/login",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(loggedInCustomer);

  // 4. Customer creates a saved address
  const customerAddressCreate = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: "Zed City",
    postal_code: "99999",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: loggedInCustomer.id,
        body: customerAddressCreate,
      },
    );
  typia.assert(customerAddress);

  // 5. Customer creates a cart and adds the SKU as an item
  const cartCreate = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert(cart);

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

  // 6. Create an order referencing saved address, shipping method and payment method
  const orderCreate: IShoppingMallOrder.ICreate = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 7. Attach initial shipping address snapshot with non-null optional fields
  const initialSnapshotCreate = {
    recipient_name: customerAddress.recipient_name,
    line1: customerAddress.line1,
    line2: customerAddress.line2 ?? "Unit 101",
    city: customerAddress.city,
    postal_code: customerAddress.postal_code,
    country_code: country.country_code,
    region: "Initial Region",
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
  } satisfies IShoppingMallOrderShippingAddress.ICreate;
  const initialShipping: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: initialSnapshotCreate,
      },
    );
  typia.assert(initialShipping);

  TestValidator.predicate(
    "initial optional fields should be non-null",
    initialShipping.line2 !== null &&
      initialShipping.region !== null &&
      initialShipping.phone_number !== null,
  );

  // 8. Update shipping address to clear optional fields line2, region, phone_number
  const updateBody: IShoppingMallOrderShippingAddress.IUpdate = {
    line2: null,
    region: null,
    phone_number: null,
  };
  const updated: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.update(
      connection,
      {
        orderCode: order.order_code,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 9. Validate unchanged required fields and cleared optional fields
  TestValidator.equals(
    "recipient_name should stay unchanged",
    updated.recipient_name,
    initialShipping.recipient_name,
  );
  TestValidator.equals(
    "line1 should stay unchanged",
    updated.line1,
    initialShipping.line1,
  );
  TestValidator.equals(
    "city should stay unchanged",
    updated.city,
    initialShipping.city,
  );
  TestValidator.equals(
    "postal_code should stay unchanged",
    updated.postal_code,
    initialShipping.postal_code,
  );
  TestValidator.equals(
    "country_code should stay unchanged",
    updated.country_code,
    initialShipping.country_code,
  );

  TestValidator.equals(
    "line2 should be null after update",
    updated.line2,
    null,
  );
  TestValidator.equals(
    "region should be null after update",
    updated.region,
    null,
  );
  TestValidator.equals(
    "phone_number should be null after update",
    updated.phone_number,
    null,
  );
}
