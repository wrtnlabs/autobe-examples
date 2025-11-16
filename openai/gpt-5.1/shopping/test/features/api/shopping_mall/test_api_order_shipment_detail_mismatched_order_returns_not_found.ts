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
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
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

export async function test_api_order_shipment_detail_mismatched_order_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Platform admin registration (to be complete, although we rely mostly on seller/customer flows)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller registration & login
  const sellerEmail = `seller+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.seller.id;

  // 3. Switch back to platform admin (login) to create brand/product/SKU
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3-1. Create a brand
  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3-2. Create a product owned by the seller
  const productCode = `PROD-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product-${RandomGenerator.alphabets(8)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
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

  // 3-3. Create a SKU under the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const skuBody = {
    code: skuCode,
    name: `SKU-${RandomGenerator.alphabets(6)}`,
    listPrice: 10000,
    salePrice: 10000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 4. Switch to seller to set up inventory for the SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 5. Customer registration and cart setup
  const customerEmail = `customer+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Create a persistent cart
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
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

  // Add one item into the cart referencing the SKU
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: null,
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

  // Helper to create a simple order from the existing cart
  const createOrderFromCart = async (): Promise<IShoppingMallOrder> => {
    const currencyCode = cart.currency_code;

    const subtotal = 10000;
    const discount = 0;
    const shipping = 0;
    const tax = 0;
    const grandTotal = subtotal - discount + shipping + tax;

    const orderBody = {
      customer_cart_id: cart.id,
      currency_code: currencyCode,
      items_subtotal_amount: subtotal,
      discount_total_amount: discount,
      shipping_total_amount: shipping,
      tax_total_amount: tax,
      grand_total_amount: grandTotal,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: undefined,
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);
    return order;
  };

  // 6. Create the first and second orders (A and B)
  const orderA = await createOrderFromCart();
  const orderB = await createOrderFromCart();

  // 7. Seller creates shipments for each order
  //    We rely on typia.random for the shipment creation body as we don't have
  //    order seller segment listing APIs.

  // Switch to seller context again in case customer join/login overwrote it
  const sellerReLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerReAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReLoginBody,
    });
  typia.assert(sellerReAuthorized);

  // For shipment creation, we must provide order_seller_segment_id but we do not
  // have an API to retrieve it from order. However, the existing mock tests use
  // typia.random<IShoppingMallShipment.ICreate>(), and the simulator/back-end
  // can accept that here. We follow the same pattern.

  const shipmentCreateBodyA = typia.random<IShoppingMallShipment.ICreate>();
  const shipmentA: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: orderA.id,
      body: shipmentCreateBodyA,
    });
  typia.assert(shipmentA);

  const shipmentCreateBodyB = typia.random<IShoppingMallShipment.ICreate>();
  const shipmentB: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: orderB.id,
      body: shipmentCreateBodyB,
    });
  typia.assert(shipmentB);

  // 8. Happy path: correct order/shipment pair returns details
  const fetchedShipmentA: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.at(connection, {
      orderId: shipmentA.order.id,
      shipmentId: shipmentA.id,
    });
  typia.assert(fetchedShipmentA);

  TestValidator.equals(
    "happy path: shipment id matches",
    fetchedShipmentA.id,
    shipmentA.id,
  );
  TestValidator.equals(
    "happy path: shipment order id matches",
    fetchedShipmentA.order.id,
    shipmentA.order.id,
  );

  // 9. Negative path: mismatched combinations must not return shipment details
  // 9-1. Use order from shipmentA but shipmentId from shipmentB
  await TestValidator.error(
    "mismatched orderId (A) with shipmentId (B) should fail",
    async () => {
      await api.functional.shoppingMall.orders.shipments.at(connection, {
        orderId: shipmentA.order.id,
        shipmentId: shipmentB.id,
      });
    },
  );

  // 9-2. Use order from shipmentB but shipmentId from shipmentA
  await TestValidator.error(
    "mismatched orderId (B) with shipmentId (A) should fail",
    async () => {
      await api.functional.shoppingMall.orders.shipments.at(connection, {
        orderId: shipmentB.order.id,
        shipmentId: shipmentA.id,
      });
    },
  );
}
