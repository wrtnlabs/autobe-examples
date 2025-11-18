import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductRatingAggregate";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartCheckoutPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreview";
import type { IShoppingMallCartCheckoutPreviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewItem";
import type { IShoppingMallCartCheckoutPreviewMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewMessage";
import type { IShoppingMallCartCheckoutPreviewTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewTotals";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCartValidationError } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationError";
import type { IShoppingMallCartValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationResult";
import type { IShoppingMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationWarning";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import type { IShoppingMallProductRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRatingAggregate";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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

export async function test_api_product_rating_aggregate_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Seller join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Customer join and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 4. As admin: create one SKU inventory state and one category
  const skuInventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Standard purchasable inventory state for test",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateBody },
    );
  typia.assert(skuInventoryState);

  const categoryBody = {
    parent_id: null,
    slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category for Rating Aggregates",
    description_en: "Category used by E2E test for rating aggregates.",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 5. As seller: create many products (e.g., 20) and for each create one SKU
  const productCount: number & tags.Type<"int32"> & tags.Minimum<10> = 20;

  const products: IShoppingMallProduct[] = [];
  const skus: IShoppingMallSku[] = [];

  for (let i = 0; i < productCount; i++) {
    const productBody = {
      code: `P-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      summary: RandomGenerator.paragraph({ sentences: 5 }),
      description: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 8,
        wordMin: 3,
        wordMax: 8,
      }),
      brand: null,
      model_name: null,
      status: "active",
      primary_image_uri: null,
      default_locale: "en-US",
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productBody,
      });
    typia.assert(product);
    products.push(product);

    // assign category as admin for each product
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

    // create a SKU for each product
    const skuBody = {
      code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      barcode: null,
      status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
      price: 1000 as number & tags.Minimum<0>,
      original_price: null,
      inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 10 as
        | (number & tags.Type<"int32"> & tags.Minimum<0>)
        | null
        | undefined,
      shopping_mall_sku_inventory_state_id: skuInventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;

    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id,
          body: skuBody,
        },
      );
    typia.assert(sku);
    skus.push(sku);
  }

  // 6. As customer: create a cart and add SKUs (not strictly needed for rating aggregates,
  // but exercise realistic flow including orders and reviews)
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // Add a subset of SKUs to the cart
  const skusForCart = skus.slice(0, 10);
  const cartItemSummaries: IShoppingMallCartItem[] = [];

  for (const sku of skusForCart) {
    const cartItemBody = {
      shopping_mall_sku_id: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);
    cartItemSummaries.push(cartItem);
  }

  const validationResult: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id,
    });
  typia.assert(validationResult);

  // Generate a simple checkout preview
  const checkoutPreviewBody = {
    shipping_method_code: undefined,
    payment_method_code: undefined,
    coupon_codes: undefined,
    country_code: undefined,
    region_code: undefined,
  } satisfies IShoppingMallCartCheckoutPreview.IRequest;

  const checkoutPreview: IShoppingMallCartCheckoutPreview =
    await api.functional.shoppingMall.customer.carts.checkoutPreview.index(
      connection,
      {
        cartId: cart.id,
        body: checkoutPreviewBody,
      },
    );
  typia.assert(checkoutPreview);

  // 7. Create a simple order from the cart so that reviews can be considered verified purchase
  const orderItemsBody = cartItemSummaries.map(
    (item): IShoppingMallOrderItem.ICreate => ({
      shopping_mall_sku_id: item.shopping_mall_sku_id,
      quantity: item.quantity,
    }),
  );

  const shippingAddressSnapshotBody = {
    recipient_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    country_code: "US",
    postal_code: "12345",
    state_or_region: "CA",
    city: "San Francisco",
    address_line1: "1 Market St",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: orderItemsBody,
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotBody,
    shipping_method_id: null,
    payment_method_id: null,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 8. As customer: create one review per product to seed rating aggregates
  const ratings: number[] = [];
  for (let i = 0; i < products.length; i++) {
    // cycle ratings 1-5 to get diversity
    const ratingValue = ((i % 5) + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>;
    ratings.push(ratingValue);

    const reviewBody = {
      rating: ratingValue,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IShoppingMallReview.ICreate;

    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: products[i].id,
          body: reviewBody,
        },
      );
    typia.assert(review);
  }

  // 9. Call rating aggregate search with various scenarios

  const baseRequest: IShoppingMallProductRatingAggregate.IRequest = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    minAverageRating: undefined,
    maxAverageRating: undefined,
    minRatingCount: undefined,
    productIds: undefined,
    sortBy: "ratingCount",
    sortDirection: "desc",
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const page0RatingCount: IPageIShoppingMallProductRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.products.index(
      connection,
      { body: baseRequest },
    );
  typia.assert(page0RatingCount);

  // second page, same sort
  const page1Request: IShoppingMallProductRatingAggregate.IRequest = {
    ...baseRequest,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const page1RatingCount: IPageIShoppingMallProductRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.products.index(
      connection,
      { body: page1Request },
    );
  typia.assert(page1RatingCount);

  // third request: sort by lastComputedAt desc
  const lastComputedRequest: IShoppingMallProductRatingAggregate.IRequest = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    minAverageRating: undefined,
    maxAverageRating: undefined,
    minRatingCount: undefined,
    productIds: undefined,
    sortBy: "lastComputedAt",
    sortDirection: "desc",
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const page0LastComputed: IPageIShoppingMallProductRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.products.index(
      connection,
      { body: lastComputedRequest },
    );
  typia.assert(page0LastComputed);

  // optional: change pageSize to 5
  const smallPageRequest: IShoppingMallProductRatingAggregate.IRequest = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    pageSize: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    minAverageRating: undefined,
    maxAverageRating: undefined,
    minRatingCount: undefined,
    productIds: undefined,
    sortBy: "ratingCount",
    sortDirection: "desc",
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const page0Small: IPageIShoppingMallProductRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.products.index(
      connection,
      { body: smallPageRequest },
    );
  typia.assert(page0Small);

  // 10. Validate pagination metadata and page sizes
  const checkPagination = (
    title: string,
    page: IPageIShoppingMallProductRatingAggregate.ISummary,
    expectedPage: number,
    expectedLimit: number,
  ) => {
    const p: IPage.IPagination = page.pagination;
    typia.assert<IPage.IPagination>(p);

    TestValidator.equals(
      `${title}: current page matches`,
      p.current,
      expectedPage as number & tags.Type<"int32"> & tags.Minimum<0>,
    );
    TestValidator.equals(
      `${title}: limit matches`,
      p.limit,
      expectedLimit as number & tags.Type<"int32"> & tags.Minimum<0>,
    );
    TestValidator.predicate(`${title}: records non-negative`, p.records >= 0);
    TestValidator.predicate(`${title}: pages non-negative`, p.pages >= 0);

    TestValidator.predicate(
      `${title}: data length <= limit`,
      page.data.length <= expectedLimit,
    );
  };

  checkPagination("page0-ratingCount", page0RatingCount, 0, 10);
  checkPagination("page1-ratingCount", page1RatingCount, 1, 10);
  checkPagination("page0-lastComputed", page0LastComputed, 0, 10);
  checkPagination("page0-small", page0Small, 0, 5);

  // 11. Verify disjointness of product IDs between page 0 and 1 (same sort)
  const idsPage0 = page0RatingCount.data.map(
    (agg) => agg.shopping_mall_product_id,
  );
  const idsPage1 = page1RatingCount.data.map(
    (agg) => agg.shopping_mall_product_id,
  );

  const idSet0 = new Set(idsPage0);
  const idSet1 = new Set(idsPage1);

  const overlap = idsPage0.filter((id) => idSet1.has(id));

  TestValidator.predicate(
    "page0 and page1 product IDs are disjoint under same sort options",
    overlap.length === 0 || page1RatingCount.data.length === 0,
  );

  // 12. Validate ratingCount sort: non-increasing rating_count
  const assertNonIncreasingRatingCount = (
    title: string,
    page: IPageIShoppingMallProductRatingAggregate.ISummary,
  ) => {
    for (let i = 1; i < page.data.length; i++) {
      const prev = page.data[i - 1].rating_count;
      const curr = page.data[i].rating_count;
      TestValidator.predicate(
        `${title}: rating_count[${i - 1}] >= rating_count[${i}]`,
        prev >= curr,
      );
    }
  };

  assertNonIncreasingRatingCount("page0-ratingCount", page0RatingCount);
  assertNonIncreasingRatingCount("page1-ratingCount", page1RatingCount);
  assertNonIncreasingRatingCount("page0-small", page0Small);

  // 13. Validate lastComputedAt sort: non-increasing last_computed_at
  const assertNonIncreasingLastComputed = (
    title: string,
    page: IPageIShoppingMallProductRatingAggregate.ISummary,
  ) => {
    for (let i = 1; i < page.data.length; i++) {
      const prev = page.data[i - 1].last_computed_at;
      const curr = page.data[i].last_computed_at;
      TestValidator.predicate(
        `${title}: last_computed_at[${i - 1}] >= last_computed_at[${i}]`,
        prev >= curr,
      );
    }
  };

  assertNonIncreasingLastComputed("page0-lastComputed", page0LastComputed);

  // 14. Confirm that pageSize change adjusts pagination and preserves ordering semantics
  TestValidator.equals(
    "small page has limit 5",
    page0Small.pagination.limit,
    5 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  const topIdsFromPage0 = idsPage0.slice(0, page0Small.data.length);
  const smallIds = page0Small.data.map((agg) => agg.shopping_mall_product_id);

  TestValidator.equals(
    "small page is prefix of large-page ratingCount ordering",
    smallIds,
    topIdsFromPage0,
  );
}
