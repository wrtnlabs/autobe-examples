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

/**
 * Validate basic cart friction analytics for a simple time-range window without
 * segmentation.
 *
 * Business flow:
 *
 * 1. Register an admin (POST /auth/admin/join) and rely on SDK to attach admin
 *    access token to the connection.
 * 2. Register a customer (POST /auth/customer/join) and rely on SDK to attach
 *    customer token.
 * 3. As the customer, create a cart (POST /shoppingMall/customer/carts) with
 *    actor_type="customer" and a currency_code, then add a single cart item
 *    (POST /shoppingMall/customer/carts/{cartId}/items) for some random SKU id
 *    and quantity.
 * 4. Switch back to the admin by logging in (POST /auth/admin/login) with the same
 *    admin email, letting SDK set the admin token on connection.
 * 5. Call cart friction analytics endpoint (PATCH
 *    /shoppingMall/admin/carts/analytics/friction) using
 *    api.functional.shoppingMall.admin.carts.analytics.friction.index with
 *    IShoppingMallCartFrictionAnalytics.IRequest:
 *
 *    - Time_range.from: now minus 1 day
 *    - Time_range.to: now plus a small offset (e.g., +1 minute)
 *    - Segmentations: omitted (so no segmentation)
 *    - Filters: omitted (no filters)
 *    - Include_time_series: false
 *    - Max_bucket_count: small positive int (e.g., 10)
 * 6. Validate the response structure and core business invariants using
 *    typia.assert and TestValidator:
 *
 *    - Typia.assert on IShoppingMallCartFrictionAnalytics
 *    - TimeRange.from/to are inside or equal the requested window
 *    - Overall.carts.totalCarts >= 0
 *    - Overall.abandonment.cartAbandonmentRate is between 0 and 1
 *    - Overall.validationFailures.totalValidationFailures >= 0 and byReason is an
 *         array
 *    - Segments is an array; if non-empty, each segment has segmentKey, dimensions,
 *         carts, abandonment, validationFailures; call typia.assert on each
 *         segment
 *    - Ensure that the concrete customer email we used does not appear in the
 *         analytics payload by scanning the JSON string representation.
 */
export async function test_api_cart_friction_analytics_basic_time_range_no_segmentation(
  connection: api.IConnection,
) {
  // 1. Register admin via /auth/admin/join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 2. Register customer via /auth/customer/join
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  // 3. As customer, create a cart and add an item
  // At this point, connection Authorization header belongs to customer
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

  // Add a cart item with random SKU id and quantity 1
  const cartItemCreateBody = {
    shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // 4. Switch back to admin via /auth/admin/login
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 5. Call cart friction analytics endpoint as admin
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + 60 * 1000);

  const requestTimeRange = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  } satisfies IShoppingMallCartFrictionAnalytics.ITimeRange;

  const analyticsRequestBody = {
    time_range: requestTimeRange,
    // segmentations omitted for no segmentation
    // filters omitted for no filters
    include_time_series: false,
    max_bucket_count: 10,
  } satisfies IShoppingMallCartFrictionAnalytics.IRequest;

  const analytics: IShoppingMallCartFrictionAnalytics =
    await api.functional.shoppingMall.admin.carts.analytics.friction.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );

  // 6. Validate response structure and core invariants
  typia.assert<IShoppingMallCartFrictionAnalytics>(analytics);

  // Validate effective timeRange within or equal requested window
  const tr: IShoppingMallAnalyticsTimeRange = analytics.timeRange;
  typia.assert<IShoppingMallAnalyticsTimeRange>(tr);

  const requestedFrom = new Date(requestTimeRange.from).getTime();
  const requestedTo = new Date(requestTimeRange.to).getTime();
  const actualFrom = new Date(tr.from).getTime();
  const actualTo = new Date(tr.to).getTime();

  TestValidator.predicate(
    "analytics.timeRange.from should be >= requested from",
    actualFrom >= requestedFrom,
  );
  TestValidator.predicate(
    "analytics.timeRange.to should be <= requested to",
    actualTo <= requestedTo,
  );

  // Validate overall section
  const overall: IShoppingMallCartFrictionAnalyticsOverall = analytics.overall;
  typia.assert<IShoppingMallCartFrictionAnalyticsOverall>(overall);

  const cartsCounts: IShoppingMallCartCounts = overall.carts;
  typia.assert<IShoppingMallCartCounts>(cartsCounts);

  TestValidator.predicate(
    "overall.carts.totalCarts is non-negative",
    cartsCounts.totalCarts >= 0,
  );

  const abandonment: IShoppingMallCartAbandonmentMetrics = overall.abandonment;
  typia.assert<IShoppingMallCartAbandonmentMetrics>(abandonment);

  TestValidator.predicate(
    "abandonment.cartAbandonmentRate between 0 and 1",
    abandonment.cartAbandonmentRate >= 0 &&
      abandonment.cartAbandonmentRate <= 1,
  );

  const validationFailures: IShoppingMallCartValidationFailureDistribution =
    overall.validationFailures;
  typia.assert<IShoppingMallCartValidationFailureDistribution>(
    validationFailures,
  );

  TestValidator.predicate(
    "overall.validationFailures.totalValidationFailures is non-negative",
    validationFailures.totalValidationFailures >= 0,
  );

  // segments validations
  const segments: IShoppingMallCartFrictionAnalyticsSegment[] =
    analytics.segments;

  TestValidator.predicate("segments array is defined", Array.isArray(segments));

  for (const seg of segments) {
    typia.assert<IShoppingMallCartFrictionAnalyticsSegment>(seg);

    const dims: IShoppingMallAnalyticsDimensions = seg.dimensions;
    typia.assert<IShoppingMallAnalyticsDimensions>(dims);

    const segCarts: IShoppingMallCartCounts = seg.carts;
    typia.assert<IShoppingMallCartCounts>(segCarts);

    const segAbandon: IShoppingMallCartAbandonmentMetrics = seg.abandonment;
    typia.assert<IShoppingMallCartAbandonmentMetrics>(segAbandon);

    const segFailures: IShoppingMallCartValidationFailureDistribution =
      seg.validationFailures;
    typia.assert<IShoppingMallCartValidationFailureDistribution>(segFailures);
  }

  // Ensure that the concrete customer email does not appear anywhere in
  // analytics payload in obviously exposed places by checking JSON string.
  const analyticsJson = JSON.stringify(analytics);
  TestValidator.predicate(
    "analytics payload should not contain customer email string",
    analyticsJson.includes(customerEmail) === false,
  );
}
