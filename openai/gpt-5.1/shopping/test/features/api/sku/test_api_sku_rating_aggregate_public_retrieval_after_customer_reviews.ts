import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuRatingAggregate";

export async function test_api_sku_rating_aggregate_public_retrieval_after_customer_reviews(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin#1234",
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: "Admin#1234",
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Admin creates a purchasable SKU inventory state
  const skuStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock",
    description: "Default purchasable inventory state for tests",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuStateBody },
    );
  typia.assert(skuInventoryState);

  // 3. Seller joins and logs in
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller#1234",
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "Seller#1234",
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Seller creates a base product
  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/product.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Admin logs in again and creates a category, links product to category
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const categoryBody = {
    parent_id: null,
    slug: `test-category-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category created for SKU rating aggregate test",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

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

  // 6. Seller logs in again and creates a SKU for that product
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. Customer joins and logs in
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "Customer#1234",
    ip: null,
    href: "https://customer.shoppingmall.test/join",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: "Customer#1234",
    ip: null,
    href: "https://customer.shoppingmall.test/login",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 8. Customer creates a cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: product.default_locale === "en-US" ? "USD" : "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 9. Customer adds SKU as a cart item
  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  // 10. Validate the cart
  const validation: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id,
    });
  typia.assert(validation);
  await TestValidator.predicate(
    "cart should be valid before checkout",
    async () => validation.isValid === true,
  );

  // 11. Generate checkout preview
  const checkoutPreviewBody = {
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
        body: checkoutPreviewBody,
      },
    );
  typia.assert(preview);

  await TestValidator.predicate(
    "checkout should allow proceeding",
    async () => preview.allowed_to_checkout === true,
  );

  // 12. Create an order for this cart and SKU
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 2,
  };

  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
      country_code: "US",
      postal_code: "12345",
      state_or_region: "CA",
      city: "San Francisco",
      address_line1: "123 Market Street",
      address_line2: null,
    };

  const orderBody = {
    cart_id: cart.id,
    currency_code:
      preview.totals.payable_total >= 0
        ? cart.currency_code
        : cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshot,
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

  // 13. Customer creates multiple reviews with different ratings for the SKU
  const ratings: (number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>)[] = [
    5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    4 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    3 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
  ];

  const createdReviews: IShoppingMallReview[] = [];
  for (const rating of ratings) {
    const reviewBody = {
      rating,
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      body: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
    } satisfies IShoppingMallReview.ICreate;

    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.skus.reviews.create(
        connection,
        {
          skuId: sku.id,
          body: reviewBody,
        },
      );
    typia.assert(review);
    createdReviews.push(review);
  }

  // 14. Public retrieval of SKU rating aggregate (no auth)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const aggregate: IShoppingMallSkuRatingAggregate =
    await api.functional.shoppingMall.skus.ratingAggregates.at(
      publicConnection,
      {
        skuId: sku.id,
      },
    );
  typia.assert(aggregate);

  // 15. Validate aggregate structure and business expectations
  TestValidator.equals(
    "aggregate sku id should match created sku id",
    aggregate.shopping_mall_sku_id,
    sku.id,
  );

  const expectedCount = ratings.length;
  TestValidator.predicate(
    "rating_count should be at least number of created reviews",
    aggregate.rating_count >= expectedCount,
  );

  const expectedPerScore: Record<number, number> = {
    1: ratings.filter((r) => r === 1).length,
    2: ratings.filter((r) => r === 2).length,
    3: ratings.filter((r) => r === 3).length,
    4: ratings.filter((r) => r === 4).length,
    5: ratings.filter((r) => r === 5).length,
  };

  TestValidator.predicate(
    "rating_1_count should be at least number of 1-star reviews",
    aggregate.rating_1_count >= expectedPerScore[1],
  );
  TestValidator.predicate(
    "rating_2_count should be at least number of 2-star reviews",
    aggregate.rating_2_count >= expectedPerScore[2],
  );
  TestValidator.predicate(
    "rating_3_count should be at least number of 3-star reviews",
    aggregate.rating_3_count >= expectedPerScore[3],
  );
  TestValidator.predicate(
    "rating_4_count should be at least number of 4-star reviews",
    aggregate.rating_4_count >= expectedPerScore[4],
  );
  TestValidator.predicate(
    "rating_5_count should be at least number of 5-star reviews",
    aggregate.rating_5_count >= expectedPerScore[5],
  );

  if (
    aggregate.average_rating !== null &&
    aggregate.average_rating !== undefined
  ) {
    const sum = ratings.reduce((acc, r) => acc + r, 0);
    const expectedAverage = sum / ratings.length;
    const diff = Math.abs(aggregate.average_rating - expectedAverage);
    TestValidator.predicate(
      "average_rating should be close to expected average",
      diff < 1e-6,
    );
  }

  // last_computed_at freshness check: should be >= latest review.created_at
  const latestReviewCreatedAt = createdReviews
    .map((r) => r.created_at)
    .sort()
    .slice(-1)[0];

  TestValidator.predicate(
    "last_computed_at should be >= latest review created_at",
    aggregate.last_computed_at >= latestReviewCreatedAt,
  );
}
