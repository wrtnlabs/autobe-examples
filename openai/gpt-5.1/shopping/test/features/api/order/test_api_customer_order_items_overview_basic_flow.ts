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
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItemsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemsOverview";
import type { IShoppingMallOrderItemsOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemsOverviewItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that an authenticated customer can create an order from a cart
 * containing a single SKU and then retrieve a consistent items overview for
 * that order.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a customer.
 * 2. Register and authenticate a platform admin.
 * 3. As platform admin, create a category tree, a brand, a product, and a SKU.
 * 4. Switch back to the customer and create a persistent customer cart.
 * 5. Add exactly one SKU line item to the cart with a deterministic quantity.
 * 6. Create an order from that cart with snapshot amounts consistent with the SKU
 *    price.
 * 7. Call GET /shoppingMall/customer/orders/{orderId}/itemsOverview.
 * 8. Assert that the overview header fields, summary amounts, and single item line
 *    match the order snapshot and computed expectations.
 */
export async function test_api_customer_order_items_overview_basic_flow(
  connection: api.IConnection,
) {
  // 1. Customer registration (join) -> authenticated customer session
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Platform admin registration and login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3a. Create a category tree (used only for realism, not referenced later)
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: "Main Catalog Tree",
    description: "Primary category tree for tests",
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

  // 3b. Create a brand
  const brandBody = {
    name: "Test Brand",
    slug: RandomGenerator.alphaNumeric(10),
    description: "Brand used in items overview e2e test",
    logo_uri: "https://static.example.com/logos/test-brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3c. Create a product under a synthetic seller and the created brand
  const syntheticSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productBody = {
    shopping_mall_seller_id: syntheticSellerId,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(12),
    name: "Test Product",
    short_description: "Short description for test product",
    description: "Longer description for test product in items overview flow",
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://static.example.com/products/test-product.png",
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

  // 3d. Create a SKU for that product with deterministic pricing
  const skuCurrency = "USD";
  const skuListPrice = 100;
  const skuSalePrice = 80;

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: "Test SKU Variant",
    listPrice: skuListPrice,
    salePrice: skuSalePrice,
    currency: skuCurrency,
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

  // 4. Switch back to the customer by logging in again as customer
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 5. Create a customer cart
  const cartBody = {
    currency_code: skuCurrency,
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "items_overview_basic_flow",
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

  // 6. Add one SKU as an item to the cart with deterministic quantity
  const quantity = 2;

  const cartItemBody = {
    skuId: sku.id,
    quantity,
    note: "Single line item for itemsOverview test",
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

  // 7. Create an order from the cart with snapshot amounts matching SKU pricing
  const itemsSubtotalAmount = skuSalePrice * quantity;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 0;
  const taxTotalAmount = 0;
  const grandTotalAmount =
    itemsSubtotalAmount +
    discountTotalAmount +
    shippingTotalAmount +
    taxTotalAmount;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: skuCurrency,
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please handle with care",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // Sanity checks on order monetary snapshots
  TestValidator.equals(
    "order items_subtotal_amount matches expectation",
    order.items_subtotal_amount,
    itemsSubtotalAmount,
  );
  TestValidator.equals(
    "order grand_total_amount matches expectation",
    order.grand_total_amount,
    grandTotalAmount,
  );

  // 8. Retrieve items overview for the order
  const overview: IShoppingMallOrderItemsOverview =
    await api.functional.shoppingMall.customer.orders.itemsOverview.at(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(overview);

  // 9. Validate header-level overview consistency
  TestValidator.equals(
    "overview orderId matches order id",
    overview.orderId,
    order.id,
  );
  TestValidator.equals(
    "overview currency matches order currency_code",
    overview.currency,
    order.currency_code,
  );

  // itemsCount and subtotal/grand total
  TestValidator.equals("overview itemsCount is 1", overview.itemsCount, 1);
  TestValidator.equals(
    "overview subtotalAmount matches computed subtotal",
    overview.subtotalAmount,
    itemsSubtotalAmount,
  );
  TestValidator.equals(
    "overview grandTotalAmount matches order.grand_total_amount",
    overview.grandTotalAmount,
    order.grand_total_amount,
  );

  if (overview.discountAmount !== undefined) {
    TestValidator.equals(
      "overview discountAmount is zero in basic flow",
      overview.discountAmount,
      discountTotalAmount,
    );
  }
  if (overview.taxAmount !== undefined) {
    TestValidator.equals(
      "overview taxAmount is zero in basic flow",
      overview.taxAmount,
      taxTotalAmount,
    );
  }
  if (overview.shippingFeeAmount !== undefined) {
    TestValidator.equals(
      "overview shippingFeeAmount is zero in basic flow",
      overview.shippingFeeAmount,
      shippingTotalAmount,
    );
  }

  // 10. Validate that there is exactly one item line
  TestValidator.equals("overview items length is 1", overview.items.length, 1);

  const line: IShoppingMallOrderItemsOverviewItem = overview.items[0];

  // Validate SKU/product identifiers and names vs SKU snapshot
  TestValidator.equals(
    "line productId matches product.id",
    line.productId,
    product.id,
  );
  TestValidator.equals("line skuId matches sku.id", line.skuId, sku.id);
  TestValidator.equals(
    "line productName matches product.name snapshot",
    line.productName,
    product.name,
  );
  TestValidator.equals(
    "line skuCode matches sku.code snapshot",
    line.skuCode,
    sku.code,
  );

  // Validate quantities and pricing
  TestValidator.equals(
    "line quantity matches cart item quantity",
    line.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "line unitPrice matches SKU salePrice",
    line.unitPrice,
    sku.salePrice,
  );

  const lineDiscountAmount = line.lineDiscountAmount ?? 0;
  if (line.lineDiscountAmount !== undefined) {
    TestValidator.equals(
      "line discount is zero in this basic flow",
      line.lineDiscountAmount,
      0,
    );
  }

  const expectedLineTotal = line.unitPrice * line.quantity - lineDiscountAmount;
  TestValidator.equals(
    "lineTotal equals unitPrice * quantity - lineDiscountAmount",
    line.lineTotal,
    expectedLineTotal,
  );
}
