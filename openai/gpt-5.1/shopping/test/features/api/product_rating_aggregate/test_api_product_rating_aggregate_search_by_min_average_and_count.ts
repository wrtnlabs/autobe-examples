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

export async function test_api_product_rating_aggregate_search_by_min_average_and_count(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 2. Seller join & login
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 3. Customer join & (implicitly) login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 4. Admin creates purchasable inventory state
  const skuStateBody = {
    code: `state-${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock",
    description: "Purchasable state for test SKUs",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuState);

  // 5. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category",
    description_en: "Category for rating aggregate tests",
    status: "active",
    sort_order: 1 satisfies number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 6. Seller creates three products A, B, C
  const createProduct = async (codeSuffix: string, title: string) => {
    const body = {
      code: `P-${codeSuffix}-${RandomGenerator.alphaNumeric(6)}`,
      title,
      summary: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: "TestBrand",
      model_name: `Model-${RandomGenerator.alphaNumeric(4)}`,
      status: "active",
      primary_image_uri: "https://cdn.example.com/image.jpg" as string &
        tags.Format<"uri">,
      default_locale: "en-US",
    } satisfies IShoppingMallProduct.ICreate;
    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body,
      });
    typia.assert<IShoppingMallProduct>(product);
    return product;
  };

  const productA = await createProduct("A", "Product A - High Rated");
  const productB = await createProduct("B", "Product B - Medium Rated");
  const productC = await createProduct("C", "Product C - Low Rated");

  // 7. Admin links products to category
  const linkCategory = async (productId: string & tags.Format<"uuid">) => {
    const body = {
      shopping_mall_category_id: category.id,
      is_primary: true,
    } satisfies IShoppingMallProductCategory.ICreate;
    const link: IShoppingMallProductCategory =
      await api.functional.shoppingMall.admin.products.categories.create(
        connection,
        {
          productId,
          body,
        },
      );
    typia.assert<IShoppingMallProductCategory>(link);
  };

  await linkCategory(productA.id);
  await linkCategory(productB.id);
  await linkCategory(productC.id);

  // 8. Seller creates one SKU per product
  const createSku = async (productId: string & tags.Format<"uuid">) => {
    const body = {
      code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      barcode: null,
      status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
      price: 100 as number & tags.Minimum<0>,
      original_price: null,
      inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      shopping_mall_sku_inventory_state_id: skuState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;
    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId,
          body,
        },
      );
    typia.assert<IShoppingMallSku>(sku);
    return sku;
  };

  const skuA = await createSku(productA.id);
  const skuB = await createSku(productB.id);
  const skuC = await createSku(productC.id);

  // 9. Customer cart creation
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 10. Add one item for each SKU into the cart
  const addCartItem = async (skuId: string & tags.Format<"uuid">) => {
    const body = {
      shopping_mall_sku_id: skuId,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;
    const item: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body,
        },
      );
    typia.assert<IShoppingMallCartItem>(item);
    return item;
  };

  const itemA = await addCartItem(skuA.id);
  const itemB = await addCartItem(skuB.id);
  const itemC = await addCartItem(skuC.id);

  // 11. Optionally validate cart
  const validation: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id,
    });
  typia.assert<IShoppingMallCartValidationResult>(validation);

  // 12. Checkout preview
  const previewBody = {
    shipping_method_code: undefined,
    payment_method_code: undefined,
    coupon_codes: undefined,
    country_code: undefined,
    region_code: undefined,
  } satisfies IShoppingMallCartCheckoutPreview.IRequest;
  const preview: IShoppingMallCartCheckoutPreview =
    await api.functional.shoppingMall.customer.carts.checkoutPreview.index(
      connection,
      {
        cartId: cart.id,
        body: previewBody,
      },
    );
  typia.assert<IShoppingMallCartCheckoutPreview>(preview);

  // 13. Create order from cart
  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: itemA.shopping_mall_sku_id,
        quantity: itemA.quantity,
      },
      {
        shopping_mall_sku_id: itemB.shopping_mall_sku_id,
        quantity: itemB.quantity,
      },
      {
        shopping_mall_sku_id: itemC.shopping_mall_sku_id,
        quantity: itemC.quantity,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: null,
    shipping_address_snapshot: {
      recipient_name: "John Doe",
      phone_number: RandomGenerator.mobile(),
      country_code: "US",
      postal_code: "10001",
      state_or_region: "NY",
      city: "New York",
      address_line1: "123 Test Street",
      address_line2: null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate,
    shipping_method_id: null,
    payment_method_id: null,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // Helper: create multiple reviews with specified ratings
  const createReviewsForProduct = async (
    productId: string & tags.Format<"uuid">,
    ratings: number[],
  ) => {
    for (const rating of ratings) {
      const body = {
        rating: rating as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IShoppingMallReview.ICreate;
      const review: IShoppingMallReview =
        await api.functional.shoppingMall.customer.products.reviews.create(
          connection,
          {
            productId,
            body,
          },
        );
      typia.assert<IShoppingMallReview>(review);
    }
  };

  // 14. Create review distributions
  await createReviewsForProduct(productA.id, [5, 5, 5, 5, 5, 5, 4, 4, 4, 4]);
  await createReviewsForProduct(productB.id, [4, 4, 3, 3, 3]);
  await createReviewsForProduct(productC.id, [2, 1]);

  // 15. Search rating aggregates with filters
  const minAverageRating = 4.0;
  const minRatingCount = 5 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const searchBody = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    minAverageRating,
    maxAverageRating: undefined,
    minRatingCount,
    productIds: [productA.id, productB.id, productC.id],
    sortBy: "averageRating" as const,
    sortDirection: "desc" as const,
  } satisfies IShoppingMallProductRatingAggregate.IRequest;

  const page: IPageIShoppingMallProductRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.products.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert<IPageIShoppingMallProductRatingAggregate.ISummary>(page);

  const { pagination, data } = page;

  // Basic pagination consistency checks
  TestValidator.equals(
    "pagination current page should be 0",
    pagination.current,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination limit should equal requested pageSize",
    pagination.limit,
    searchBody.pageSize,
  );
  TestValidator.predicate(
    "records should be >= returned data length",
    pagination.records >= (data?.length ?? 0),
  );
  TestValidator.predicate(
    "pages should be >= 1 when records > 0",
    pagination.records === 0 || pagination.pages >= 1,
  );

  // 16. Validate filter invariants for all returned aggregates
  for (const agg of data) {
    typia.assert<IShoppingMallProductRatingAggregate.ISummary>(agg);

    TestValidator.predicate(
      "aggregate rating_count must be >= minRatingCount",
      agg.rating_count >= minRatingCount,
    );

    if (agg.average_rating !== undefined) {
      TestValidator.predicate(
        "aggregate average_rating must be >= minAverageRating",
        agg.average_rating >= minAverageRating,
      );
    }
  }

  // 17. Validate sort order by average_rating desc (non-increasing)
  for (let i = 1; i < data.length; ++i) {
    const prev = data[i - 1].average_rating ?? 0;
    const curr = data[i].average_rating ?? 0;
    TestValidator.predicate(
      "rating aggregates must be sorted by average_rating desc",
      prev >= curr,
    );
  }

  // 18. Validate inclusion/exclusion of our three products within scoped productIds
  const byProductId = new Map<
    string,
    IShoppingMallProductRatingAggregate.ISummary
  >();
  for (const agg of data) {
    byProductId.set(agg.shopping_mall_product_id, agg);
  }

  const aggA = byProductId.get(productA.id);
  const aggB = byProductId.get(productB.id);
  const aggC = byProductId.get(productC.id);

  // Product A: should meet both thresholds and thus be present
  TestValidator.predicate(
    "Product A should appear in filtered aggregates",
    aggA !== undefined,
  );
  if (aggA !== undefined && aggA.average_rating !== undefined) {
    TestValidator.predicate(
      "Product A average_rating >= minAverageRating",
      aggA.average_rating >= minAverageRating,
    );
    TestValidator.predicate(
      "Product A rating_count >= minRatingCount",
      aggA.rating_count >= minRatingCount,
    );
  }

  // Product B: average below threshold, so it should be absent or fail predicate
  if (aggB !== undefined && aggB.average_rating !== undefined) {
    TestValidator.predicate(
      "Product B should not meet average threshold when present",
      aggB.average_rating < minAverageRating,
    );
  }

  // Product C: count below threshold, so it should be absent or fail predicate
  if (aggC !== undefined) {
    TestValidator.predicate(
      "Product C should not meet rating_count threshold when present",
      aggC.rating_count < minRatingCount,
    );
  }
}
