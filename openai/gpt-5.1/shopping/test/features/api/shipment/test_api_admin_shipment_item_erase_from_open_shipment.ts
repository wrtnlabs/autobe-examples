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
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify that an admin can erase a shipment item from a modifiable shipment and
 * that authorization and data integrity rules are respected.
 *
 * Business context:
 *
 * - Shipments are created by admins for confirmed customer orders.
 * - Each shipment has one or more shipment items, each linking to an order item
 *   and a SKU.
 * - Only admins should be allowed to manipulate shipment items.
 * - Shipments in an open/preparing state should allow item removal;
 *   shipped/delivered ones typically would not, but we will keep the shipment
 *   in an initial state here.
 *
 * Scenario steps (happy path + auth check):
 *
 * 1. Admin joins (registers) and logs in to obtain an authorized admin context.
 * 2. Seller joins and logs in to obtain a seller context for catalog authoring.
 * 3. Customer joins and logs in to obtain a customer context for ordering.
 * 4. As admin, create a country and a region (using IShoppingMallCountry.ICreate
 *    and IShoppingMallRegion.ICreate) that will be referenced by the customer
 *    shipping address.
 * 5. As admin, create a product category (IShoppingMallCategory.ICreate).
 * 6. As admin, create a SKU inventory state
 *    (IShoppingMallSkuInventoryState.ICreate) to be used when creating a SKU.
 * 7. As admin, create a shipping method (IShoppingMallShippingMethod.ICreate).
 * 8. As admin, create a payment method (IShoppingMallPaymentMethod.ICreate).
 * 9. As seller (authenticated), create a product (IShoppingMallProduct.ICreate).
 * 10. As admin, link the product to the category via
 *     api.functional.shoppingMall.admin.products.categories.create.
 * 11. As seller, create a SKU for the product using
 *     api.functional.shoppingMall.seller.products.skus.create with
 *     IShoppingMallSku.ICreate, referencing the created inventory state.
 * 12. As customer, create a cart via
 *     api.functional.shoppingMall.customer.carts.create with actor_type
 *     "customer" so it represents the authenticated customer.
 * 13. As customer, create a shipping address using
 *     api.functional.shoppingMall.customer.customers.addresses.create,
 *     referencing the created country and region.
 * 14. As customer, create an order via
 *     api.functional.shoppingMall.customer.orders.create
 *     (IShoppingMallOrder.ICreate) using:
 *
 *     - Cart_id = created cart.id
 *     - A single item referencing the SKU (IShoppingMallOrderItem.ICreate)
 *     - Shipping_address_id = created customer address.id
 *     - Shipping_method_id = created shipping method.id
 *     - Payment_method_id = created payment method.id
 *     - An inline shipping address snapshot
 *     - Simple buyer_memo and platform_note strings.
 * 15. As admin, create a shipment header for the order via
 *     api.functional.shoppingMall.admin.shipments.create with
 *     IShoppingMallShipment.ICreate, providing:
 *
 *     - OrderCode = created order.order_code
 *     - ShippingAddressId referencing the customer address
 *     - ShippingMethodId = created shipping method.id
 *     - ShippingStatus set to an initial modifiable status string (e.g.,
 *           "preparing").
 * 16. As admin, create a shipment item under that shipment via
 *     api.functional.shoppingMall.admin.shipments.items.create, using the
 *     returned shipment.shipment_code, and an IShoppingMallShipmentItem.ICreate
 *     body that links to the order.items[0].id and its sku.id, with quantity
 *     1.
 * 17. Call api.functional.shoppingMall.admin.shipments.items.erase as admin with
 *     the shipment.shipment_code and the created shipment item.id.
 * 18. Assert that the erase call completes without throwing (void response).
 * 19. Authorization negative case: switch to the customer connection
 *     (api.functional.auth.customer.login) and attempt to erase a shipment item
 *     using the same shipmentCode and shipmentItemId. Expect the API to reject
 *     the call (TestValidator.error), demonstrating that non-admin actors
 *     cannot erase shipment items.
 * 20. Since there is no dedicated GET for shipments or shipment items, we treat
 *     successful completion of the admin erase and failure of the customer
 *     erase as the primary validation criteria, and we assert type soundness on
 *     complex objects with typia.
 */
export async function test_api_admin_shipment_item_erase_from_open_shipment(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 2. Seller joins
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.test` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.test/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuthorized);
  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 3. Customer joins
  const customerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@customer.test` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.test/join" as string & tags.Format<"uri">,
    referrer: "https://shop.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);
  const customerEmail = customerAuthorized.email;
  const customerPassword = customerJoinBody.password;

  // 4. Admin login to ensure admin token is active for admin-only operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.test/login" as string & tags.Format<"uri">,
      referrer: "https://admin.test/login" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  // 5. As admin, create a country
  const countryBody = {
    country_code: RandomGenerator.alphaNumeric(2),
    name_en: "Testland",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 6. As admin, create a region under that country
  const regionBody = {
    code: RandomGenerator.alphaNumeric(4),
    name_en: "Test Region",
    region_type: "state",
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

  // 7. As admin, create a product category
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Test Category",
    description_en: "Category for shipment erase tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 8. As admin, create an inventory state
  const inventoryStateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: "In Stock",
    description: "Inventory available for purchase",
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

  // 9. As admin, create a shipping method
  const shippingMethodBody = {
    method_code: RandomGenerator.alphaNumeric(6),
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping for tests",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  // 10. As admin, create a payment method
  const paymentMethodBody = {
    code: RandomGenerator.alphaNumeric(6),
    display_name: "Test Card",
    description: "Test payment method",
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

  // 11. Switch to seller and create a product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.test/login" as string & tags.Format<"uri">,
      referrer: "https://seller.test/login" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: "Test Product",
    summary: "Product used for shipment erase test",
    description:
      "A product created specifically for testing shipment item erase.",
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://images.test/product.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 12. Switch back to admin to link product to category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.test/login2" as string & tags.Format<"uri">,
      referrer: "https://admin.test/login2" as string & tags.Format<"uri">,
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

  // 13. Switch to seller and create a SKU under the product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.test/login2" as string & tags.Format<"uri">,
      referrer: "https://seller.test/login2" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // 14. Switch to customer and create a cart
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.test/login" as string & tags.Format<"uri">,
      referrer: "https://shop.test/login" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 15. As customer, create a shipping address referencing the created country and region
  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test St",
    line2: null,
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: customerAddressBody,
      },
    );
  typia.assert(customerAddress);

  // 16. As customer, create an order for the cart with one item and selected shipping/payment methods
  const orderItemsCreate: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: sku.id,
      quantity: 1 as number & tags.Type<"int32">,
    },
  ];

  const shippingAddressSnapshotBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: orderItemsCreate,
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver quickly",
    platform_note: "Test order for shipment erase scenario",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 17. Switch back to admin and create a shipment for this order
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.test/login3" as string & tags.Format<"uri">,
      referrer: "https://admin.test/login3" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const shipmentBody = {
    orderCode: order.order_code,
    shippingAddressId: customerAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "preparing",
    carrierName: null,
    trackingNumber: null,
    expectedShipDate: null,
    shipmentItems: [],
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.create(connection, {
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 18. Create a shipment item for the first order item
  const firstOrderItem: IShoppingMallOrderItem = order.items[0];
  const shipmentItemCreateBody = {
    shopping_mall_order_item_id: firstOrderItem.id,
    shopping_mall_sku_id: firstOrderItem.sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallShipmentItem.ICreate;
  const shipmentItem: IShoppingMallShipmentItem =
    await api.functional.shoppingMall.admin.shipments.items.create(connection, {
      shipmentCode: shipment.shipment_code,
      body: shipmentItemCreateBody,
    });
  typia.assert(shipmentItem);

  // 19. Happy path: erase the shipment item as admin
  await api.functional.shoppingMall.admin.shipments.items.erase(connection, {
    shipmentCode: shipment.shipment_code,
    shipmentItemId: shipmentItem.id as string & tags.Format<"uuid">,
  });

  TestValidator.predicate("erase as admin completed without error", true);

  // 20. Authorization negative case: attempt erase as customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.test/login2" as string & tags.Format<"uri">,
      referrer: "https://shop.test/login2" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  await TestValidator.error(
    "non-admin cannot erase shipment items",
    async () => {
      await api.functional.shoppingMall.admin.shipments.items.erase(
        connection,
        {
          shipmentCode: shipment.shipment_code,
          shipmentItemId: shipmentItem.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 21. Final sanity check: existing complex objects remain type-sound
  typia.assert(order);
  typia.assert(shipment);
}
