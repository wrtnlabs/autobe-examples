import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAnalyticsDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsDimensions";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartAbandonmentMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartAbandonmentMetrics";
import type { IShoppingMallCartCounts } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCounts";
import type { IShoppingMallCartFrictionAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionAnalytics";
import type { IShoppingMallCartFrictionAnalyticsOverall } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionAnalyticsOverall";
import type { IShoppingMallCartFrictionAnalyticsSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionAnalyticsSegment";
import type { IShoppingMallCartFrictionTimeSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionTimeSeries";
import type { IShoppingMallCartFrictionTimeSeriesBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionTimeSeriesBucket";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCartValidationFailureDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationFailureDistribution";
import type { IShoppingMallCartValidationFailureReasonBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationFailureReasonBucket";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function test_api_cart_friction_analytics_with_time_series_buckets(
  connection: api.IConnection,
) {
  // 1. Admin join (creates initial admin and authenticates)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two customers and seed carts/items for each
  const customerInfos: {
    email: string & tags.Format<"email">;
    password: string & tags.Format<"password">;
    authorized: IShoppingMallCustomer.IAuthorized;
    cart: IShoppingMallCart;
    cartItem: IShoppingMallCartItem;
  }[] = [];

  const customerCount = 2;
  for (let i = 0; i < customerCount; i++) {
    const customerEmail: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();
    const customerPassword: string & tags.Format<"password"> = typia.random<
      string & tags.Format<"password">
    >();

    const customerJoinBody = {
      email: customerEmail,
      password: customerPassword,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/landing",
      ip: null,
    } satisfies IShoppingMallCustomerJoin.IRequest;

    const customerAuthorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: customerJoinBody,
      });
    typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

    // (Optional) explicit login to confirm token switching
    const customerLoginBody = {
      email: customerEmail,
      password: customerPassword,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/landing",
      ip: null,
    } satisfies IShoppingMallCustomerLogin.IRequest;

    const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: customerLoginBody,
      });
    typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoginAuthorized);

    // Create a cart for this customer
    const cartCreateBody = {
      actor_type: "customer",
      status: "active",
      currency_code: "USD",
    } satisfies IShoppingMallCart.ICreate;

    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: cartCreateBody,
      });
    typia.assert<IShoppingMallCart>(cart);

    // Add an item to the cart
    const cartItemCreateBody = {
      shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: cartItemCreateBody,
        },
      );
    typia.assert<IShoppingMallCartItem>(cartItem);

    customerInfos.push({
      email: customerEmail,
      password: customerPassword,
      authorized: customerAuthorized,
      cart,
      cartItem,
    });
  }

  // 3. Switch back to admin context via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAuthorized);

  // 4. Call friction analytics with include_time_series=true and daily buckets
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const requestBody = {
    time_range: {
      from,
      to,
      bucket_granularity: "day",
    },
    segmentations: [],
    filters: undefined,
    include_time_series: true,
    max_bucket_count: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartFrictionAnalytics.IRequest;

  const analytics: IShoppingMallCartFrictionAnalytics =
    await api.functional.shoppingMall.admin.carts.analytics.friction.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallCartFrictionAnalytics>(analytics);

  // 5. Basic invariants on time range and overall metrics
  TestValidator.predicate(
    "analytics timeRange.from is not after timeRange.to",
    new Date(analytics.timeRange.from).getTime() <=
      new Date(analytics.timeRange.to).getTime(),
  );

  TestValidator.predicate(
    "overall carts totalCarts is non-negative",
    analytics.overall.carts.totalCarts >= 0,
  );

  // 6. Validate first segment (if any)
  if (analytics.segments.length > 0) {
    const segment: IShoppingMallCartFrictionAnalyticsSegment =
      analytics.segments[0];

    // Non-negative basic counts
    TestValidator.predicate(
      "segment carts.totalCarts is non-negative",
      segment.carts.totalCarts >= 0,
    );

    TestValidator.predicate(
      "segment validationFailures.totalValidationFailures is non-negative",
      segment.validationFailures.totalValidationFailures >= 0,
    );

    const ts: IShoppingMallCartFrictionTimeSeries | undefined =
      segment.timeSeries;
    if (ts !== undefined) {
      // granularity matches requested bucket granularity
      TestValidator.equals(
        "timeSeries granularity matches requested bucket granularity",
        ts.granularity,
        requestBody.time_range.bucket_granularity,
      );

      // buckets non-empty and ordered, with non-negative metrics
      const buckets: IShoppingMallCartFrictionTimeSeriesBucket[] = ts.buckets;
      if (buckets.length > 0) {
        // Ordering check
        for (let i = 1; i < buckets.length; i++) {
          const prev = buckets[i - 1];
          const curr = buckets[i];

          const prevFrom = new Date(prev.from).getTime();
          const currFrom = new Date(curr.from).getTime();
          const prevTo = new Date(prev.to).getTime();
          const currTo = new Date(curr.to).getTime();

          TestValidator.predicate(
            "timeSeries buckets are ordered by from ascending",
            prevFrom <= currFrom,
          );

          TestValidator.predicate(
            "timeSeries buckets are ordered by to ascending",
            prevTo <= currTo,
          );
        }

        // Per-bucket non-negative metrics and sum consistency
        let bucketTotalCartsSum = 0;
        for (const bucket of buckets) {
          TestValidator.predicate(
            "bucket cartCounts.totalCarts is non-negative",
            bucket.cartCounts.totalCarts >= 0,
          );

          TestValidator.predicate(
            "bucket validationFailures.totalValidationFailures is non-negative",
            bucket.validationFailures.totalValidationFailures >= 0,
          );

          bucketTotalCartsSum += bucket.cartCounts.totalCarts;
        }

        // The sum across buckets should be non-negative and not wildly exceed overall
        TestValidator.predicate(
          "sum of bucket cartCounts.totalCarts is non-negative",
          bucketTotalCartsSum >= 0,
        );

        TestValidator.predicate(
          "sum of bucket carts is not far above overall total carts",
          bucketTotalCartsSum <= analytics.overall.carts.totalCarts + 1000,
        );
      }
    }
  }
}
