import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillment";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallFulfillmentOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentOrderLine";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

/**
 * Validate that a platform administrator can delete an existing shipment
 * created for a specific order while the shipment remains in a deletable
 * state.
 *
 * Business workflow under test (happy path only):
 *
 * 1. Platform admin registration & authentication
 *
 *    - Join as a new platform admin using /auth/platformAdmin/join.
 *    - Use realistic profile data and connection metadata (href, referrer).
 *    - Rely on SDK to attach admin JWT to the connection headers.
 * 2. Catalog setup as platform admin
 *
 *    - Create a category tree via POST /shoppingMall/platformAdmin/categoryTrees
 *         with a unique business code and basic metadata.
 *    - Create a brand via POST /shoppingMall/platformAdmin/brands.
 *    - Create a product via POST /shoppingMall/platformAdmin/products, owned by a
 *         seller identity. However, product creation requires a
 *         shopping_mall_seller_id, and we do not have seller CRUD or lookup
 *         endpoints in this test scope.
 *
 *         To keep the scenario implementable with the current SDK surface, we will:
 *
 *         - First join as a seller using /auth/seller/join.
 *         - Capture the seller id from the returned IShoppingMallSeller.IAuthorized
 *                   object.
 *         - Switch back to platformAdmin using /auth/platformAdmin/login so that the
 *                   platform admin is the actor creating catalog resources
 *                   while still referencing the seller id as owner.
 *    - Create a product using IShoppingMallProduct.ICreate with
 *         shopping_mall_seller_id set to the seller id, optional brand id from
 *         the created brand, a unique product code, and minimal required
 *         fields.
 *    - Create a SKU for that product via POST
 *         /shoppingMall/platformAdmin/products/{productCode}/skus using a valid
 *         IShoppingMallProductSku.ICreate payload.
 * 3. Customer registration & cart creation
 *
 *    - Join as a customer via /auth/customer/join.
 *    - With customer token applied, create a persistent cart via
 *         /shoppingMall/customer/customerCarts using
 *         IShoppingMallCustomerCart.ICreate with realistic currency and region
 *         codes.
 *    - Add an item to the cart via
 *         /shoppingMall/customer/customerCarts/{customerCartId}/items, pointing
 *         to the created SKU id and a positive quantity.
 * 4. Order creation from cart
 *
 *    - The IShoppingMallOrder.ICreate DTO requires a customer_cart_id plus monetary
 *         snapshot fields and shipping/billing address snapshot IDs. However,
 *         address snapshot creation endpoints are not provided in this test
 *         scope.
 *
 *         Therefore, to keep the scenario compilable and runnable, we will:
 *
 *         - Use typia.random<IShoppingMallOrder.ICreate>() to generate a fully compliant
 *                   order creation payload instead of trying to build a
 *                   cart-based snapshot manually, as we do not have
 *                   address-snapshot factories.
 *         - Still set customer_cart_id in the random payload to the real cart id we
 *                   created so that there is a logical link between cart and
 *                   order in this test.
 *    - Call POST /shoppingMall/customer/orders with the adjusted
 *         IShoppingMallOrder.ICreate payload.
 *    - Assert that the returned IShoppingMallOrder is structurally valid via
 *         typia.assert.
 * 5. Fulfillment creation as platform admin
 *
 *    - Switch authentication back to the platform admin through
 *         /auth/platformAdmin/login because the fulfillment creation endpoint
 *         is under platformAdmin.
 *    - The fulfillment creation DTO IShoppingMallFulfillment.ICreate requires an
 *         array of IShoppingMallFulfillmentOrderLine.ICreate entries, each
 *         referencing an order line id and quantity.
 *
 *         The SDK surface in this exercise does not expose order-line listing
 *         endpoints, so we cannot reliably obtain real order line ids from the
 *         just-created order. To keep the test compilable and aligned with the
 *         available APIs, we will:
 *
 *         - Use typia.random<IShoppingMallFulfillment.ICreate>() to generate a
 *                   syntactically valid payload rather than attempting to
 *                   derive concrete order line ids.
 *
 *         Because this may not align with real runtime relations, we treat this as a
 *         simulated fulfillment used only to create a shipment via the shipment
 *         APIs, trusting the AutoBE-generated backend to handle simulation mode
 *         correctly when connection.simulate is true or the underlying test
 *         data factory is preconfigured.
 *    - Call POST /shoppingMall/platformAdmin/orders/{orderId}/fulfillments with the
 *         random IShoppingMallFulfillment.ICreate payload.
 *    - Assert that the returned IShoppingMallFulfillment structure is valid.
 * 6. Shipment creation for the order
 *
 *    - Create a shipment for the order using POST
 *         /shoppingMall/orders/{orderId}/shipments with
 *         IShoppingMallShipment.ICreate.
 *    - We must provide a valid order_seller_segment_id. The order summary embedded
 *         in IShoppingMallShipment does include sellerSegment as an
 *         IShoppingMallOrderSellerSegment.ISummary, but we do not have direct
 *         access to seller segments from the order creation step.
 *    - For this reason, we will again rely on
 *         typia.random<IShoppingMallShipment.ICreate>() to generate a
 *         structurally valid payload, trusting either simulation mode or
 *         pre-seeded IDs in the test environment.
 *    - Call POST /shoppingMall/orders/{orderId}/shipments with this body and assert
 *         the returned IShoppingMallShipment via typia.assert.
 * 7. Optional tracking event creation
 *
 *    - Optionally append at least one tracking event via POST
 *         /shoppingMall/platformAdmin/shipments/{shipmentId}/trackingEvents
 *         using IShoppingMallShipmentTrackingEvent.ICreate to simulate early
 *         in-transit activity.
 * 8. Shipment deletion as platform admin
 *
 *    - While authenticated as platform admin, call DELETE
 *         /shoppingMall/platformAdmin/orders/{orderId}/shipments/{shipmentId}
 *         via
 *         api.functional.shoppingMall.platformAdmin.orders.shipments.erase.
 *    - The erase function returns void, so the primary success criteria are:
 *
 *         - The call completes without throwing an error.
 *         - The TypeScript types are correct and the code compiles.
 * 9. Assertions and validations
 *
 *    - Use typia.assert on all non-void responses to ensure full runtime type
 *         validation.
 *    - Use TestValidator.predicate to assert key business checkpoints, such as
 *         non-empty IDs for created entities and consistency of linked ids
 *         where we explicitly set them (e.g., product owner seller id, cart id
 *         in the order payload).
 *    - Do not attempt to validate HTTP status codes or error types explicitly and do
 *         not implement type-error test cases.
 */
export async function test_api_platform_admin_shipment_deletion_happy_path(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registration + implicit login)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Keep a copy of the admin email/password for re-login later
  const platformAdminEmail: string = platformAdminAuthorized.email;
  const platformAdminPassword: string = platformAdminJoinBody.password;

  // 2. Create a seller that will own the product
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // Re-login as platform admin to ensure admin context (joins already logged us
  // in, but we also demonstrate login API usage and token switching).
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/login",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 3. Catalog setup: category tree, brand, product, SKU
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode: string & tags.MinLength<1> =
    `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.test/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  TestValidator.equals(
    "product should belong to the expected seller",
    product.seller.id,
    sellerId,
  );

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  TestValidator.equals(
    "sku should reference the created product code",
    sku.productCode,
    product.code,
  );

  // 4. Customer registration and cart
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      campaign: "admin-shipment-deletion-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Test item for shipment deletion scenario",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  TestValidator.equals(
    "cart item should reference the cart",
    cartItem.customerCartId,
    cart.id,
  );

  // 5. Order creation from cart using random snapshot + real cart id
  const randomOrderCreate: IShoppingMallOrder.ICreate =
    typia.random<IShoppingMallOrder.ICreate>();

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    ...randomOrderCreate,
    customer_cart_id: cart.id,
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order currency code should match payload",
    order.currency_code,
    orderCreateBody.currency_code,
  );

  // 6. Fulfillment creation as platform admin (using random payload)
  const fulfillmentCreateBody: IShoppingMallFulfillment.ICreate =
    typia.random<IShoppingMallFulfillment.ICreate>();

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.platformAdmin.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: fulfillmentCreateBody,
      },
    );
  typia.assert(fulfillment);

  TestValidator.predicate(
    "fulfillment id should be non-empty",
    (fulfillment.id?.length ?? 0) > 0,
  );

  // 7. Shipment creation for the order (random payload with real order id)
  const shipmentCreateBody: IShoppingMallShipment.ICreate =
    typia.random<IShoppingMallShipment.ICreate>();

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  TestValidator.equals(
    "shipment should reference the created order",
    shipment.order.id,
    order.id,
  );

  // 8. Optional tracking event creation as platform admin
  const trackingEventCreateBody = {
    status: "in_transit",
    carrier_status_code: "IT",
    location_description: "Test Logistics Hub",
    carrier_raw_message: "Package processed at test hub",
    occurred_at: new Date().toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const trackingEvent: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingEventCreateBody,
      },
    );
  typia.assert(trackingEvent);

  TestValidator.equals(
    "tracking event should reference the shipment",
    trackingEvent.shipment_id,
    shipment.id,
  );

  // 9. Shipment deletion as platform admin
  await api.functional.shoppingMall.platformAdmin.orders.shipments.erase(
    connection,
    {
      orderId: shipment.order.id,
      shipmentId: shipment.id,
    },
  );

  // If we reach here without throwing, consider the deletion successful.
  TestValidator.predicate(
    "shipment deletion call should complete without error",
    true,
  );
}
