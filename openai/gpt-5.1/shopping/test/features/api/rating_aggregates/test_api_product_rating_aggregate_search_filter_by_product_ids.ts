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

export async function test_api_product_rating_aggregate_search_filter_by_product_ids(
  connection: api.IConnection,
) {
  /**
   * Validate that product rating aggregate search can be filtered by explicit
   * product IDs.
   *
   * Business goal: Ensure that PATCH /shoppingMall/ratingAggregates/products
   * respects the `productIds` filter by only returning aggregates whose
   * `shopping_mall_product_id` is in the provided list, while leaving
   * pagination metadata consistent with the filtered result set. Also verify
   * behavior when filtering by product IDs that have no aggregates.
   *
   * High level steps:
   *
   * 1. Create admin, seller, and customer actors via join/login flows.
   * 2. As admin, create an inventory state used by SKUs and a category used by all
   *    products.
   * 3. As seller, create four products (P1-P4) in the catalog.
   * 4. As admin, assign all products to the created category.
   * 5. As seller, create one SKU per product using the created inventory state.
   * 6. As customer, create a cart and add one SKU from each product, validate the
   *    cart, generate a checkout preview, and create an order.
   * 7. As customer, create at least one review for each product P1-P4 to ensure
   *    rating aggregates exist for all four.
   * 8. Call ratingAggregates.products.index with `productIds` = [P1.id, P3.id] and
   *    neutral filters (no minAverageRating or minRatingCount) so no aggregates
   *    are excluded except by ID.
   * 9. Assert that:
   *
   *    - All returned aggregates have shopping_mall_product_id in {P1.id, P3.id}.
   *    - No aggregate for P2 or P4 appears.
   *    - Pagination.records equals data.length and pages is consistent (>= 1 when
   *         there are results).
   * 10. Call ratingAggregates.products.index with `productIds` that currently have
   *     no aggregates (e.g., a fresh random UUID) and assert that data is empty
   *     and pagination.records/pages indicate no results.
   */

  // ---------------------------------------------------------------------------
  // 1. Admin, seller, customer join/login
  // ---------------------------------------------------------------------------

  const adminEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();

  // Admin join & login
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
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
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Seller join & login
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
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
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // Customer join & login
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
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
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // ---------------------------------------------------------------------------
  // 2. Admin: create inventory state and category
  // ---------------------------------------------------------------------------

  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Purchasable inventory state for in-stock SKUs",
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

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Rating Test Category",
    description_en: "Category used for rating aggregate filtering tests.",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // ---------------------------------------------------------------------------
  // 3. Seller: create four products P1-P4
  // ---------------------------------------------------------------------------

  const productBodies: IShoppingMallProduct.ICreate[] = [0, 1, 2, 3].map(
    (index) => {
      return {
        code: `P-${RandomGenerator.alphaNumeric(6)}-${index}`,
        title: `Rating Test Product ${index + 1}`,
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "TestBrand",
        model_name: `Model-${index + 1}`,
        status: "active",
        primary_image_uri: "https://cdn.example.com/images/test-product.jpg",
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate;
    },
  );

  const products: IShoppingMallProduct[] = [];
  for (const body of productBodies) {
    const created: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body,
      });
    typia.assert(created);
    products.push(created);
  }

  const [p1, p2, p3, p4] = products;

  // ---------------------------------------------------------------------------
  // 4. Admin: assign each product to the category
  // ---------------------------------------------------------------------------

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  for (const product of products) {
    const productCategory: IShoppingMallProductCategory =
      await api.functional.shoppingMall.admin.products.categories.create(
        connection,
        {
          productId: product.id,
          body: productCategoryBody,
        },
      );
    typia.assert(productCategory);
  }

  // ---------------------------------------------------------------------------
  // 5. Seller: create one SKU per product with the inventory state
  // ---------------------------------------------------------------------------

  const skus: IShoppingMallSku[] = [];
  for (const product of products) {
    const skuBody = {
      code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
      barcode: null,
      status: "active",
      price: 100 + skus.length * 10,
      original_price: 120 + skus.length * 10,
      inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
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

  // ---------------------------------------------------------------------------
  // 6. Customer: create cart, add SKUs, validate, checkout preview, create order
  // ---------------------------------------------------------------------------

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

  for (const sku of skus) {
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
  }

  const validationResult: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id,
    });
  typia.assert(validationResult);

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

  const orderItems = skus.map((sku) => {
    return {
      shopping_mall_sku_id: sku.id,
      quantity: 1 as number & tags.Type<"int32">,
    } satisfies IShoppingMallOrderItem.ICreate;
  });

  const shippingAddressSnapshotBody = {
    recipient_name: "Rating Test Customer",
    phone_number: RandomGenerator.mobile(),
    country_code: "US",
    postal_code: "12345",
    state_or_region: "CA",
    city: "Test City",
    address_line1: "123 Test Street",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: orderItems,
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

  // ---------------------------------------------------------------------------
  // 7. Customer: create at least one review for each product P1-P4
  // ---------------------------------------------------------------------------

  const reviewBodies: IShoppingMallReview.ICreate[] = products.map(
    (product, index) => {
      const ratingBase = (index % 5) + 1;
      return {
        rating: ratingBase as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        title: `Review for ${product.title}`,
        body: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallReview.ICreate;
    },
  );

  const reviews: IShoppingMallReview[] = [];
  for (let i = 0; i < products.length; i++) {
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: products[i].id,
          body: reviewBodies[i],
        },
      );
    typia.assert(review);
    reviews.push(review);
  }

  TestValidator.equals(
    "one review per product should be created",
    reviews.length,
    products.length,
  );

  // ---------------------------------------------------------------------------
  // 8. Search rating aggregates filtered by [P1.id, P3.id]
  // ---------------------------------------------------------------------------

  const filterProductIds = [p1.id, p3.id];

  const aggregateRequestBodyFiltered = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    minAverageRating: undefined,
    maxAverageRating: undefined,
    minRatingCount: undefined,
    productIds: filterProductIds,
    sortBy: "averageRating" as const,
    sortDirection: "desc" as const,
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const filteredAggregatesPage: IPageIShoppingMallProductRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.products.index(
      connection,
      {
        body: aggregateRequestBodyFiltered,
      },
    );
  typia.assert(filteredAggregatesPage);

  const filteredData = filteredAggregatesPage.data;
  const filteredPagination = filteredAggregatesPage.pagination;

  for (const agg of filteredData) {
    typia.assert(agg);
    TestValidator.predicate(
      "aggregate productId must be in filterProductIds",
      filterProductIds.includes(agg.shopping_mall_product_id),
    );
  }

  const disallowedIds = [p2.id, p4.id];
  for (const agg of filteredData) {
    TestValidator.predicate(
      "no aggregate for disallowed product ids",
      !disallowedIds.includes(agg.shopping_mall_product_id),
    );
  }

  TestValidator.equals(
    "pagination.records equals data length for filtered result",
    filteredPagination.records,
    filteredData.length,
  );

  TestValidator.predicate(
    "pagination.pages should be at least 1 when results exist",
    filteredData.length === 0
      ? filteredPagination.pages === 0
      : filteredPagination.pages >= 1,
  );

  // ---------------------------------------------------------------------------
  // 9. Search rating aggregates with productIds that have no aggregates
  // ---------------------------------------------------------------------------

  const nonExistingProductId = typia.random<string & tags.Format<"uuid">>();

  const aggregateRequestBodyEmpty = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    minAverageRating: undefined,
    maxAverageRating: undefined,
    minRatingCount: undefined,
    productIds: [nonExistingProductId],
    sortBy: "averageRating" as const,
    sortDirection: "desc" as const,
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const emptyAggregatesPage: IPageIShoppingMallProductRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.products.index(
      connection,
      {
        body: aggregateRequestBodyEmpty,
      },
    );
  typia.assert(emptyAggregatesPage);

  TestValidator.equals(
    "no aggregates should be returned for non-existing product id",
    emptyAggregatesPage.data.length,
    0,
  );

  TestValidator.equals(
    "pagination.records should be 0 when no aggregates returned",
    emptyAggregatesPage.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination.pages should be 0 when no aggregates returned",
    emptyAggregatesPage.pagination.pages,
    0,
  );
}
