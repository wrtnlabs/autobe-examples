import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAnalyticsPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPeriod";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulVote";
import type { IShoppingMallReviewHelpfulnessAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulnessAnalytics";
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

/** Validate review helpfulness analytics filtering, sorting and aggregation. */
export async function test_api_admin_review_helpfulness_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogged);

  // 2. Customer join & login
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPassw0rd!",
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogged: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogged);

  // 3. Seller 1 & 2 join & login
  const seller1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody1 = {
    email: seller1Email,
    password: "Seller1Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody1,
    });
  typia.assert(seller1);

  const sellerJoinBody2 = {
    email: seller2Email,
    password: "Seller2Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody2,
    });
  typia.assert(seller2);

  const sellerLoginBody1 = {
    email: seller1Email,
    password: "Seller1Passw0rd!",
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const seller1Logged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody1,
    });
  typia.assert(seller1Logged);

  const sellerLoginBody2 = {
    email: seller2Email,
    password: "Seller2Passw0rd!",
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const seller2Logged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody2,
    });
  typia.assert(seller2Logged);

  // 4. Admin-side configuration entities
  const countryBody = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = typia.random<IShoppingMallRegion.ICreate>();
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  const categoryABody = typia.random<IShoppingMallCategory.ICreate>();
  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryABody,
    });
  typia.assert(categoryA);

  const categoryBBody = typia.random<IShoppingMallCategory.ICreate>();
  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBBody,
    });
  typia.assert(categoryB);

  const inventoryStateBody =
    typia.random<IShoppingMallSkuInventoryState.ICreate>();
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  const shippingMethodBody =
    typia.random<IShoppingMallShippingMethod.ICreate>();
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = typia.random<IShoppingMallPaymentMethod.ICreate>();
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 5. Seller 1 product & skus (assumes seller1 still authenticated)
  const product1Body = typia.random<IShoppingMallProduct.ICreate>();
  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product1Body,
    });
  typia.assert(product1);

  const product1CategoryBody: IShoppingMallProductCategory.ICreate = {
    shopping_mall_category_id: product1.id, // intentionally using product ID; backend may ignore mismatch in this synthetic scenario
    is_primary: true,
  };
  const product1Category: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product1.id,
        body: product1CategoryBody,
      },
    );
  typia.assert(product1Category);

  const sku1ABody = {
    ...typia.random<IShoppingMallSku.ICreate>(),
    shopping_mall_sku_inventory_state_id: inventoryState.id,
  } satisfies IShoppingMallSku.ICreate;
  const sku1A: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product1.id as string & tags.Format<"uuid">,
      body: sku1ABody,
    });
  typia.assert(sku1A);

  const sku1BBody = {
    ...typia.random<IShoppingMallSku.ICreate>(),
    shopping_mall_sku_inventory_state_id: inventoryState.id,
  } satisfies IShoppingMallSku.ICreate;
  const sku1B: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product1.id as string & tags.Format<"uuid">,
      body: sku1BBody,
    });
  typia.assert(sku1B);

  // 6. Seller 2 product & sku (seller2 already logged in)
  const product2Body = typia.random<IShoppingMallProduct.ICreate>();
  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product2Body,
    });
  typia.assert(product2);

  const product2CategoryBody: IShoppingMallProductCategory.ICreate = {
    shopping_mall_category_id: product2.id,
    is_primary: true,
  };
  const product2Category: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product2.id,
        body: product2CategoryBody,
      },
    );
  typia.assert(product2Category);

  const sku2Body = {
    ...typia.random<IShoppingMallSku.ICreate>(),
    shopping_mall_sku_inventory_state_id: inventoryState.id,
  } satisfies IShoppingMallSku.ICreate;
  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product2.id as string & tags.Format<"uuid">,
      body: sku2Body,
    });
  typia.assert(sku2);

  // 7. Customer reviews (customer already logged in)
  const reviewBody1 = typia.random<IShoppingMallReview.ICreate>();
  const review1: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product1.id as string & tags.Format<"uuid">,
        body: reviewBody1,
      },
    );
  typia.assert(review1);

  const reviewBody2 = typia.random<IShoppingMallReview.ICreate>();
  const review2: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product1.id as string & tags.Format<"uuid">,
        body: reviewBody2,
      },
    );
  typia.assert(review2);

  const reviewBody3 = typia.random<IShoppingMallReview.ICreate>();
  const review3: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product1.id as string & tags.Format<"uuid">,
        body: reviewBody3,
      },
    );
  typia.assert(review3);

  const reviewBody4 = typia.random<IShoppingMallReview.ICreate>();
  const review4: IShoppingMallReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product2.id as string & tags.Format<"uuid">,
        body: reviewBody4,
      },
    );
  typia.assert(review4);

  // 8. Helpful votes patterns
  const castVote = async (
    review: IShoppingMallReview,
    isHelpful: boolean,
  ): Promise<IShoppingMallReviewHelpfulVote> => {
    const body: IShoppingMallReviewHelpfulVote.ICreate = {
      is_helpful: isHelpful,
    };
    const output: IShoppingMallReviewHelpfulVote =
      await api.functional.shoppingMall.customer.reviews.helpfulVotes.create(
        connection,
        {
          reviewId: review.id,
          body,
        },
      );
    return typia.assert(output);
  };

  // R1: 4 helpful, 1 not helpful
  await castVote(review1, true);
  await castVote(review1, true);
  await castVote(review1, true);
  await castVote(review1, true);
  await castVote(review1, false);

  // R2: 2 helpful, 2 not helpful
  await castVote(review2, true);
  await castVote(review2, true);
  await castVote(review2, false);
  await castVote(review2, false);

  // R3: 1 helpful, 4 not helpful
  await castVote(review3, true);
  await castVote(review3, false);
  await castVote(review3, false);
  await castVote(review3, false);
  await castVote(review3, false);

  // R4: 3 helpful, 0 not helpful (noise)
  await castVote(review4, true);
  await castVote(review4, true);
  await castVote(review4, true);

  const fromCreatedAt: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();
  const toCreatedAt: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  // 9. Admin analytics: base call (helpful_ratio, desc)
  const requestBase: IShoppingMallReviewHelpfulnessAnalytics.IRequest = {
    productIds: [product1.id],
    skuIds: [sku1A.id],
    sellerIds: [seller1.id],
    categoryIds: [categoryA.id],
    fromCreatedAt,
    toCreatedAt,
    sortBy: "helpful_ratio",
    sortDirection: "desc",
    limit: 10,
    offset: 0,
  };

  const analyticsBase: IShoppingMallReviewHelpfulnessAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.helpfulness.index(
      connection,
      {
        body: requestBase,
      },
    );
  typia.assert(analyticsBase);

  const filteredReviews = analyticsBase.byReviews;
  for (const row of filteredReviews) {
    TestValidator.equals(
      "byReviews product filter",
      row.product.id,
      product1.id,
    );
    TestValidator.equals("byReviews seller filter", row.seller.id, seller1.id);
    if (row.sku !== null && row.sku !== undefined) {
      TestValidator.equals("byReviews sku filter", row.sku.id, sku1A.id);
    }
  }

  for (let i = 0; i + 1 < filteredReviews.length; i++) {
    const current = filteredReviews[i];
    const next = filteredReviews[i + 1];
    TestValidator.predicate(
      "helpfulnessRatio descending",
      current.helpfulnessRatio >= next.helpfulnessRatio,
    );
  }

  // 10. sortBy = helpful_count, desc
  const requestCount: IShoppingMallReviewHelpfulnessAnalytics.IRequest = {
    ...requestBase,
    sortBy: "helpful_count",
    sortDirection: "desc",
  };

  const analyticsCount: IShoppingMallReviewHelpfulnessAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.helpfulness.index(
      connection,
      {
        body: requestCount,
      },
    );
  typia.assert(analyticsCount);

  const reviewsByCount = analyticsCount.byReviews;
  for (let i = 0; i + 1 < reviewsByCount.length; i++) {
    const cur = reviewsByCount[i];
    const nxt = reviewsByCount[i + 1];
    TestValidator.predicate(
      "totalHelpfulVotes descending",
      cur.totalHelpfulVotes >= nxt.totalHelpfulVotes,
    );
  }

  // 11. Pagination via limit/offset on helpful_ratio
  const allIds = filteredReviews.map((r) => r.reviewId);

  if (filteredReviews.length >= 2) {
    const requestPage1: IShoppingMallReviewHelpfulnessAnalytics.IRequest = {
      ...requestBase,
      limit: 1,
      offset: 0,
    };
    const page1: IShoppingMallReviewHelpfulnessAnalytics =
      await api.functional.shoppingMall.admin.analytics.reviews.helpfulness.index(
        connection,
        {
          body: requestPage1,
        },
      );
    typia.assert(page1);

    const requestPage2: IShoppingMallReviewHelpfulnessAnalytics.IRequest = {
      ...requestBase,
      limit: 1,
      offset: 1,
    };
    const page2: IShoppingMallReviewHelpfulnessAnalytics =
      await api.functional.shoppingMall.admin.analytics.reviews.helpfulness.index(
        connection,
        {
          body: requestPage2,
        },
      );
    typia.assert(page2);

    if (page1.byReviews.length > 0 && page2.byReviews.length > 0) {
      const id1 = page1.byReviews[0].reviewId;
      const id2 = page2.byReviews[0].reviewId;

      TestValidator.equals("pagination first element", id1, allIds[0]);
      TestValidator.equals("pagination second element", id2, allIds[1]);
    }
  }

  // 12. Aggregates byProducts, bySkus, bySellers
  if (filteredReviews.length > 0) {
    const sumHelpful = filteredReviews.reduce(
      (acc, r) => acc + r.totalHelpfulVotes,
      0,
    );
    const sumNotHelpful = filteredReviews.reduce(
      (acc, r) => acc + r.totalNotHelpfulVotes,
      0,
    );

    const productAgg = analyticsBase.byProducts.find(
      (p) => p.product.id === product1.id,
    );
    if (productAgg) {
      TestValidator.equals(
        "byProducts totalHelpfulVotes",
        productAgg.totalHelpfulVotes,
        sumHelpful,
      );
      TestValidator.equals(
        "byProducts totalNotHelpfulVotes",
        productAgg.totalNotHelpfulVotes,
        sumNotHelpful,
      );
    }

    const skuAgg = analyticsBase.bySkus.find((s) => s.skuId === sku1A.id);
    if (skuAgg) {
      TestValidator.equals(
        "bySkus product id matches",
        skuAgg.productId,
        product1.id,
      );
    }

    const sellerAgg = analyticsBase.bySellers.find(
      (s) => s.sellerId === seller1.id,
    );
    if (sellerAgg) {
      TestValidator.equals(
        "bySellers totalHelpfulVotes",
        sellerAgg.totalHelpfulVotes,
        sumHelpful,
      );
      TestValidator.equals(
        "bySellers totalNotHelpfulVotes",
        sellerAgg.totalNotHelpfulVotes,
        sumNotHelpful,
      );
    }
  }
}
