import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSellerSegment";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
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

export async function test_api_order_seller_segments_index_for_multi_seller_order(
  connection: api.IConnection,
) {
  // 1. Register platform admin (not strictly used later but kept for scenario completeness)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.localhost/join",
    referrer: "https://admin.localhost/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register two sellers
  const sellerJoin = async (): Promise<IShoppingMallSeller.IAuthorized> => {
    const body = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      storeName: RandomGenerator.name(2),
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest;

    const seller = await api.functional.auth.seller.join(connection, {
      body,
    });
    typia.assert(seller);
    return seller;
  };

  const sellerA = await sellerJoin();
  const sellerB = await sellerJoin();

  // Helper to create a product, SKU and inventory for a seller
  const createCatalogForSeller = async (
    seller: IShoppingMallSeller.IAuthorized,
  ): Promise<{
    product: IShoppingMallProduct;
    sku: IShoppingMallProductSku;
  }> => {
    // Ensure seller is the current actor
    const sellerLoginBody = {
      email: seller.email,
      password: "" as string, // password is not returned; use a fresh login body instead of login here
      ip: null,
      href: "https://seller.localhost/login",
      referrer: "https://seller.localhost/",
    } satisfies IShoppingMallSellerLogin.IRequest;
    // We cannot actually login with the original password since it is not stored,
    // but join already authenticated and set the token, so no further login is strictly necessary.

    const productCode = RandomGenerator.alphaNumeric(12);

    const productBody = {
      shopping_mall_seller_id: seller.id,
      shopping_mall_brand_id: undefined,
      code: productCode,
      name: RandomGenerator.name(2),
      short_description: null,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: "active",
      is_multi_sku: true,
      primary_image_uri: undefined,
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productBody,
      });
    typia.assert(product);

    // Create a single SKU for the product
    const skuCode = RandomGenerator.alphaNumeric(10);
    const listPrice = 10000;
    const salePrice = 9000;

    const skuBody = {
      code: skuCode,
      name: `${product.name} SKU`,
      listPrice,
      salePrice,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;

    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode,
          body: skuBody,
        },
      );
    typia.assert(sku);

    // Create inventory item for SKU
    const inventoryBody = {
      product_sku_id: sku.id,
      on_hand_quantity: 10,
      low_stock_threshold: 1,
      backorder_enabled: false,
      preorder_enabled: false,
    } satisfies IShoppingMallInventoryItem.ICreate;

    const inventory: IShoppingMallInventoryItem =
      await api.functional.shoppingMall.seller.inventoryItems.create(
        connection,
        {
          body: inventoryBody,
        },
      );
    typia.assert(inventory);

    return { product, sku };
  };

  const catalogA = await createCatalogForSeller(sellerA);
  const catalogB = await createCatalogForSeller(sellerB);

  // 3. Register customer and create cart
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.localhost/join",
    referrer: "https://customer.localhost/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

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

  // 4. Add one item from each seller into the cart
  const addItem = async (
    sku: IShoppingMallProductSku,
  ): Promise<IShoppingMallCustomerCartItem> => {
    const body = {
      skuId: sku.id,
      quantity: 1,
      note: null,
    } satisfies IShoppingMallCustomerCartItem.ICreate;

    const item: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id,
          body,
        },
      );
    typia.assert(item);
    return item;
  };

  const itemA = await addItem(catalogA.sku);
  const itemB = await addItem(catalogB.sku);

  // 5. Create order from cart
  const itemsSubtotal = catalogA.sku.salePrice + catalogB.sku.salePrice;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "multi-seller order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order grand_total_amount should equal computed grand total",
    order.grand_total_amount,
    grandTotal,
  );

  // 6. Call sellerSegments index with no filters
  const firstPage: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {},
    });
  typia.assert(firstPage);

  const pagination = firstPage.pagination;
  const segments = firstPage.data;

  TestValidator.equals("pagination current should be 0", pagination.current, 0);
  TestValidator.equals(
    "there should be exactly 2 segments",
    pagination.records,
    2,
  );
  TestValidator.equals(
    "pages should be 1 when 2 records and default limit",
    pagination.pages,
    1,
  );
  TestValidator.equals("data length should be 2", segments.length, 2);

  // All segments belong to the created order
  for (const seg of segments) {
    typia.assert(seg);
    TestValidator.equals(
      "segment.order.id equals order.id",
      seg.order.id,
      order.id,
    );
  }

  // Collect seller ids and ensure they match sellerA and sellerB
  const segmentSellerIds = segments.map((seg) => seg.seller.id);
  const expectedSellerIds = [sellerA.id, sellerB.id];

  const hasSellerA = segmentSellerIds.includes(sellerA.id);
  const hasSellerB = segmentSellerIds.includes(sellerB.id);

  TestValidator.predicate("segments include sellerA", hasSellerA);
  TestValidator.predicate("segments include sellerB", hasSellerB);

  // Sum of segment grand_total_amount should equal order grand_total_amount
  const segmentsGrandTotal = segments.reduce(
    (sum, seg) => sum + seg.grand_total_amount,
    0,
  );
  TestValidator.equals(
    "sum of segment grand_total_amount equals order grand_total_amount",
    segmentsGrandTotal,
    order.grand_total_amount,
  );

  // 7. Filter by seller_id (sellerA)
  const sellerAFiltered: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerA.id,
      },
    });
  typia.assert(sellerAFiltered);

  const sellerAPagination = sellerAFiltered.pagination;
  const sellerASegments = sellerAFiltered.data;

  TestValidator.equals(
    "sellerA filter records should be 1",
    sellerAPagination.records,
    1,
  );
  TestValidator.equals(
    "sellerA filter pages should be 1",
    sellerAPagination.pages,
    1,
  );
  TestValidator.equals(
    "sellerA filter data length should be 1",
    sellerASegments.length,
    1,
  );

  const sellerASegment = sellerASegments[0];
  TestValidator.equals(
    "sellerA segment seller id matches",
    sellerASegment.seller.id,
    sellerA.id,
  );
  TestValidator.equals(
    "sellerA segment order id matches",
    sellerASegment.order.id,
    order.id,
  );

  // 8. Pagination with limit=1
  const page0: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    });
  typia.assert(page0);

  TestValidator.equals("page0 limit should be 1", page0.pagination.limit, 1);
  TestValidator.equals(
    "page0 records should be 2",
    page0.pagination.records,
    2,
  );
  TestValidator.equals("page0 pages should be 2", page0.pagination.pages, 2);
  TestValidator.equals("page0 data length should be 1", page0.data.length, 1);

  const page1: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    });
  typia.assert(page1);

  TestValidator.equals("page1 data length should be 1", page1.data.length, 1);

  const pagedSellerIds = [
    ...page0.data.map((seg) => seg.seller.id),
    ...page1.data.map((seg) => seg.seller.id),
  ];

  const hasSellerAInPaged = pagedSellerIds.includes(sellerA.id);
  const hasSellerBInPaged = pagedSellerIds.includes(sellerB.id);

  TestValidator.predicate("paged results include sellerA", hasSellerAInPaged);
  TestValidator.predicate("paged results include sellerB", hasSellerBInPaged);
}
