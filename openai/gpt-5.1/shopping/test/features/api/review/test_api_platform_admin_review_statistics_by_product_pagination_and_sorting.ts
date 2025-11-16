import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewStatisticsByProduct";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatisticsByProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_review_statistics_by_product_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain authorized context
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register seller and login
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(2),
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
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const sellerId = sellerLoggedIn.id;

  // Helper to create a product with one option type, option value, sku and inventory
  const createProductWithSku = async (
    code: string,
    name: string,
  ): Promise<{
    product: IShoppingMallProduct;
    sku: IShoppingMallProductSku;
  }> => {
    const productBody = {
      shopping_mall_seller_id: sellerId,
      shopping_mall_brand_id: brand.id,
      code,
      name,
      short_description: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
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

    // Create option type
    const optionTypeBody = {
      name: "Option",
      display_name: "Option",
      display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies IShoppingMallProductOptionType.ICreate;

    const optionType: IShoppingMallProductOptionType =
      await api.functional.shoppingMall.seller.products.optionTypes.create(
        connection,
        {
          productCode: product.code,
          body: optionTypeBody,
        },
      );
    typia.assert(optionType);

    // Create option value
    const optionValueBody = {
      value: "Default",
      display_name: "Default",
      display_order: 0 as number & tags.Type<"int32">,
      is_active: true,
    } satisfies IShoppingMallProductOptionValue.ICreate;

    const optionValue: IShoppingMallProductOptionValue =
      await api.functional.shoppingMall.seller.products.optionTypes.values.create(
        connection,
        {
          productCode: product.code,
          productOptionTypeId: optionType.id,
          body: optionValueBody,
        },
      );
    typia.assert(optionValue);

    // Create SKU
    const skuBody = {
      code: `${code}-SKU`,
      name: `${name} SKU`,
      listPrice: 10000,
      salePrice: 10000,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;

    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: skuBody,
        },
      );
    typia.assert(sku);

    // Create inventory item for SKU
    const inventoryBody = {
      product_sku_id: sku.id,
      on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // 4. Create products A, B, C with one SKU each
  const productAResult = await createProductWithSku(
    `CODE-A-${RandomGenerator.alphaNumeric(6)}`,
    "Product A",
  );
  const productBResult = await createProductWithSku(
    `CODE-B-${RandomGenerator.alphaNumeric(6)}`,
    "Product B",
  );
  const productCResult = await createProductWithSku(
    `CODE-C-${RandomGenerator.alphaNumeric(6)}`,
    "Product C",
  );

  const productA = productAResult.product;
  const productB = productBResult.product;
  const productC = productCResult.product;

  const skuA = productAResult.sku;
  const skuB = productBResult.sku;
  const skuC = productCResult.sku;

  // 5. Register customer and login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
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

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 6. Create a customer cart
  const customerCartBody = {
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
        body: customerCartBody,
      },
    );
  typia.assert(cart);

  const cartId = cart.id;

  // 7. Add cart items for each SKU
  const createCartItem = async (
    sku: IShoppingMallProductSku,
  ): Promise<IShoppingMallCustomerCartItem> => {
    const cartItemBody = {
      skuId: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: null,
    } satisfies IShoppingMallCustomerCartItem.ICreate;

    const item: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cartId,
          body: cartItemBody,
        },
      );
    typia.assert(item);
    return item;
  };

  const cartItemA = await createCartItem(skuA);
  const cartItemB = await createCartItem(skuB);
  const cartItemC = await createCartItem(skuC);
  typia.assert(cartItemA);
  typia.assert(cartItemB);
  typia.assert(cartItemC);

  // 8. Create an order from the cart
  const itemsSubtotalAmount = 30000;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 0;
  const taxTotalAmount = 0;
  const grandTotalAmount =
    itemsSubtotalAmount -
    discountTotalAmount +
    shippingTotalAmount +
    taxTotalAmount;

  const orderCreateBody = {
    customer_cart_id: cartId,
    currency_code: "KRW",
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Test order for review statistics",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 9. Create reviews for products with specific ratings
  const createReview = async (
    productId: string,
    rating: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  ): Promise<IShoppingMallProductReview> => {
    const reviewBody = {
      rating,
      title: "Review",
      body: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies IShoppingMallProductReview.ICreate;

    const review: IShoppingMallProductReview =
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId,
          body: reviewBody,
        },
      );
    typia.assert(review);
    return review;
  };

  // Product A: three reviews with ratings 5,4,5
  const reviewA1 = await createReview(
    productA.id,
    5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  );
  const reviewA2 = await createReview(
    productA.id,
    4 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  );
  const reviewA3 = await createReview(
    productA.id,
    5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  );
  typia.assert(reviewA1);
  typia.assert(reviewA2);
  typia.assert(reviewA3);

  // Product B: one review with rating 2
  const reviewB1 = await createReview(
    productB.id,
    2 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  );
  typia.assert(reviewB1);

  // Product C: two reviews with ratings 3,3
  const reviewC1 = await createReview(
    productC.id,
    3 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  );
  const reviewC2 = await createReview(
    productC.id,
    3 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  );
  typia.assert(reviewC1);
  typia.assert(reviewC2);

  // 10. Re-login as platform admin to ensure correct actor when calling statistics
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 11. Request statistics ordered by averageRating desc with pagination (limit=2, offset=0)
  const statsRequestPage1 = {
    productIds: [productA.id, productB.id, productC.id],
    sellerIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: true,
    includeRejected: true,
    regionCodes: undefined,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    offset: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    orderBy: "averageRating" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const page1: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.byProduct.index(
      connection,
      {
        body: statsRequestPage1,
      },
    );
  typia.assert(page1);

  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page1 pagination limit is 2",
    page1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page1 pagination current page index is 0",
    page1.pagination.current,
    0,
  );

  // Validate data length
  TestValidator.equals("page1 has exactly 2 entries", page1.data.length, 2);

  // Ensure ordering by averageRating desc
  TestValidator.predicate(
    "page1 entries sorted by averageRating desc",
    page1.data[0].averageRating >= page1.data[1].averageRating,
  );

  const page1ProductIds = page1.data.map((entry) => entry.product.id);

  // Expect Product A then Product C on first page
  TestValidator.equals(
    "page1 first product is Product A",
    page1ProductIds[0],
    productA.id,
  );
  TestValidator.equals(
    "page1 second product is Product C",
    page1ProductIds[1],
    productC.id,
  );

  // 12. Second page: offset=2, same limit and ordering
  const statsRequestPage2 = {
    productIds: [productA.id, productB.id, productC.id],
    sellerIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: true,
    includeRejected: true,
    regionCodes: undefined,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    offset: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    orderBy: "averageRating" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const page2: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.byProduct.index(
      connection,
      {
        body: statsRequestPage2,
      },
    );
  typia.assert(page2);

  // Derived expected current page index from offset/limit: 2/2 = 1
  const expectedPage2Index = 1;
  TestValidator.equals(
    "page2 pagination current page index derived from offset/limit",
    page2.pagination.current,
    expectedPage2Index,
  );

  // Only one remaining product (Product B)
  TestValidator.equals("page2 has exactly 1 entry", page2.data.length, 1);

  const page2ProductId = page2.data[0]?.product.id;
  TestValidator.equals(
    "page2 product is Product B",
    page2ProductId,
    productB.id,
  );

  // 13. Order by reviewCount asc with limit=3, offset=0
  const statsRequestByCount = {
    productIds: [productA.id, productB.id, productC.id],
    sellerIds: undefined,
    skuIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: true,
    includeRejected: true,
    regionCodes: undefined,
    limit: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    offset: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    orderBy: "reviewCount" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const pageByCount: IPageIShoppingMallProductReviewStatisticsByProduct =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.byProduct.index(
      connection,
      {
        body: statsRequestByCount,
      },
    );
  typia.assert(pageByCount);

  // All three products should be present
  TestValidator.equals("pageByCount has 3 entries", pageByCount.data.length, 3);

  const orderedByCountIds = pageByCount.data.map((entry) => entry.product.id);
  const orderedByCountValues = pageByCount.data.map(
    (entry) => entry.totalReviewCount,
  );

  // Expect review counts: B=1, C=2, A=3
  TestValidator.equals(
    "first product by reviewCount is Product B",
    orderedByCountIds[0],
    productB.id,
  );
  TestValidator.equals(
    "second product by reviewCount is Product C",
    orderedByCountIds[1],
    productC.id,
  );
  TestValidator.equals(
    "third product by reviewCount is Product A",
    orderedByCountIds[2],
    productA.id,
  );

  TestValidator.equals(
    "Product B totalReviewCount is 1",
    orderedByCountValues[0],
    1,
  );
  TestValidator.equals(
    "Product C totalReviewCount is 2",
    orderedByCountValues[1],
    2,
  );
  TestValidator.equals(
    "Product A totalReviewCount is 3",
    orderedByCountValues[2],
    3,
  );
}
