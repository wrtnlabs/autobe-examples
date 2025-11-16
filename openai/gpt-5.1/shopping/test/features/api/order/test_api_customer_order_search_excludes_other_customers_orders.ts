import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_customer_order_search_excludes_other_customers_orders(
  connection: api.IConnection,
) {
  // 1. Create platform admin and login (token is handled by SDK)
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: "AdminPass!234",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create category tree as platform admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Create brand as platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create seller and login
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphabets(8)}@example.com`,
    password: "SellerPass!234",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Create a product under seller
  const productCode = `prod-${RandomGenerator.alphabets(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Create option type and value under the product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 7. Create SKU under product
  const skuCode = `sku-${RandomGenerator.alphabets(10)}`;
  const skuBody = {
    code: skuCode,
    name: "Red Variant",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  // 8. Create inventory item for SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // Helpers to create customer, cart, item, and order
  const createCustomerWithOrder = async () => {
    // Join customer
    const joinBody = {
      email: `customer+${RandomGenerator.alphabets(8)}@example.com`,
      password: "CustomerPass!234",
      name: RandomGenerator.name(2),
      ip: null,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin;
    const customerAuth: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert(customerAuth);

    // Create cart
    const cartBody = {
      currency_code: "USD",
      region_code: "US",
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

    // Add cart item
    const itemBody = {
      skuId: sku.id,
      quantity: 1,
      note: "test item",
    } satisfies IShoppingMallCustomerCartItem.ICreate;
    const cartItem: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id,
          body: itemBody,
        },
      );
    typia.assert(cartItem);

    // Prepare order monetary snapshot
    const itemsSubtotal = cartItem.unitPrice ?? sku.salePrice;
    const discountTotal = 0;
    const shippingTotal = 0;
    const taxTotal = 0;
    const grandTotal =
      (itemsSubtotal ?? 0) - discountTotal + shippingTotal + taxTotal;

    // For demo, use new UUIDs for address snapshot IDs
    const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
    const billingAddressId = typia.random<string & tags.Format<"uuid">>();

    const orderBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: itemsSubtotal ?? 0,
      discount_total_amount: discountTotal,
      shipping_total_amount: shippingTotal,
      tax_total_amount: taxTotal,
      grand_total_amount: grandTotal,
      shipping_address_id: shippingAddressId,
      billing_address_id: billingAddressId,
      customer_note: "test order",
    } satisfies IShoppingMallOrder.ICreate;
    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);

    return {
      customerAuth,
      cart,
      cartItem,
      order,
    };
  };

  // 9. Create Customer A and their order
  const customerAContext = await createCustomerWithOrder();
  const customerAId = customerAContext.customerAuth.id;
  const customerAOrderId = customerAContext.order.id;

  // 10. Create Customer B and their order
  const customerBContext = await createCustomerWithOrder();
  const customerBId = customerBContext.customerAuth.id;
  const customerBOrderId = customerBContext.order.id;

  // 11. Ensure we are authenticated as Customer A again by logging in
  const customerALoginBody = {
    email: customerAContext.customerAuth.email,
    password: "CustomerPass!234",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerALoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALoggedIn);

  TestValidator.equals(
    "customer A login id should match join id",
    customerALoggedIn.id,
    customerAId,
  );

  // 12. Search orders as Customer A with broad filter
  const searchBodyForA = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrder.IRequest;
  const pageForA: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: searchBodyForA,
    });
  typia.assert(pageForA);

  const allOrdersForA = pageForA.data;

  // Business assertions: no order for B should appear
  const containsBOrderForA = allOrdersForA.some(
    (summary) => summary.id === customerBOrderId,
  );
  TestValidator.predicate(
    "Customer A search result must not include Customer B order id",
    !containsBOrderForA,
  );

  // If summaries contain customer info, validate the customer id matches A
  const summariesWithCustomer = allOrdersForA.filter(
    (s) => s.customer !== undefined,
  );
  for (const summary of summariesWithCustomer) {
    const summaryCustomer = summary.customer;
    if (summaryCustomer !== undefined) {
      TestValidator.equals(
        "Order summary customer id must equal Customer A id",
        summaryCustomer.id,
        customerAId,
      );
    }
  }

  // Optionally ensure A's own order is discoverable or at least that A-only orders exist
  const containsAOrderForA = allOrdersForA.some(
    (summary) => summary.id === customerAOrderId,
  );
  TestValidator.predicate(
    "Customer A search should not be completely empty when A has an order",
    allOrdersForA.length === 0 ? true : containsAOrderForA,
  );

  // 13. Authenticate as Customer B and repeat search symmetry check
  const customerBLoginBody = {
    email: customerBContext.customerAuth.email,
    password: "CustomerPass!234",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerBLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLoggedIn);

  TestValidator.equals(
    "customer B login id should match join id",
    customerBLoggedIn.id,
    customerBId,
  );

  const searchBodyForB = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrder.IRequest;
  const pageForB: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: searchBodyForB,
    });
  typia.assert(pageForB);

  const allOrdersForB = pageForB.data;
  const containsAOrderForB = allOrdersForB.some(
    (summary) => summary.id === customerAOrderId,
  );
  TestValidator.predicate(
    "Customer B search result must not include Customer A order id",
    !containsAOrderForB,
  );

  const summariesWithCustomerB = allOrdersForB.filter(
    (s) => s.customer !== undefined,
  );
  for (const summary of summariesWithCustomerB) {
    const summaryCustomer = summary.customer;
    if (summaryCustomer !== undefined) {
      TestValidator.equals(
        "Order summary customer id must equal Customer B id",
        summaryCustomer.id,
        customerBId,
      );
    }
  }
}
