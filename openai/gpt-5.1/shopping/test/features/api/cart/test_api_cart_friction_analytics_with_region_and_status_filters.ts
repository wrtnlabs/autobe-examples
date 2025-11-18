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

export async function test_api_cart_friction_analytics_with_region_and_status_filters(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin using /auth/admin/join
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two different customers via /auth/customer/join
  const createCustomer =
    async (): Promise<IShoppingMallCustomer.IAuthorized> => {
      const body = {
        email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
        password: RandomGenerator.alphabets(12),
        ip: null,
        href: "https://shop.example.com/join",
        referrer: "https://shop.example.com/landing",
      } satisfies IShoppingMallCustomerJoin.IRequest;

      const customer = await api.functional.auth.customer.join(connection, {
        body,
      });
      return typia.assert<IShoppingMallCustomer.IAuthorized>(customer);
    };

  const customer1 = await createCustomer();
  const customer2 = await createCustomer();
  void customer1;
  void customer2;

  // 3. For each customer, create at least one cart and add at least one item
  const createCartWithItem = async (): Promise<{
    cart: IShoppingMallCart;
    item: IShoppingMallCartItem;
  }> => {
    // Cart creation as authenticated customer (SDK already set Authorization)
    const cartBody = {
      actor_type: "customer",
      currency_code: "USD",
    } satisfies IShoppingMallCart.ICreate;

    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: cartBody,
      });
    typia.assert<IShoppingMallCart>(cart);

    // Add one random item to the cart
    const cartItemBody = typia.random<IShoppingMallCartItem.ICreate>();

    const item: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: cartItemBody,
        },
      );
    typia.assert<IShoppingMallCartItem>(item);

    return { cart, item };
  };

  const seeded1 = await createCartWithItem();
  const seeded2 = await createCartWithItem();
  void seeded1;
  void seeded2;

  // 4. Switch the connection back to an admin actor using /auth/admin/login
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 5. Build IShoppingMallCartFrictionAnalytics.IRequest for the analytics query
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const requestBody = {
    time_range: {
      from,
      to,
      bucket_granularity: undefined,
    } satisfies IShoppingMallCartFrictionAnalytics.ITimeRange,
    segmentations: ["region"],
    filters: {
      cart_statuses: ["active", "converted_to_order"],
    } satisfies IShoppingMallCartFrictionAnalytics.IFilter,
    include_time_series: false,
    max_bucket_count: 20,
  } satisfies IShoppingMallCartFrictionAnalytics.IRequest;

  // 6. Call analytics endpoint
  const analytics: IShoppingMallCartFrictionAnalytics =
    await api.functional.shoppingMall.admin.carts.analytics.friction.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallCartFrictionAnalytics>(analytics);

  // 7. Basic structural and logical assertions
  TestValidator.predicate(
    "segments array should be defined",
    analytics.segments !== undefined,
  );

  // Segments-level checks
  for (const segment of analytics.segments) {
    typia.assert<IShoppingMallCartFrictionAnalyticsSegment>(segment);

    const dims: IShoppingMallAnalyticsDimensions = segment.dimensions;
    typia.assert<IShoppingMallAnalyticsDimensions>(dims);

    const carts: IShoppingMallCartCounts = segment.carts;
    typia.assert<IShoppingMallCartCounts>(carts);

    TestValidator.predicate(
      "segment carts.totalCarts non-negative",
      carts.totalCarts >= 0,
    );
    TestValidator.predicate(
      "segment carts.cartsReachedCheckout non-negative",
      carts.cartsReachedCheckout >= 0,
    );

    const abandonment: IShoppingMallCartAbandonmentMetrics =
      segment.abandonment;
    typia.assert<IShoppingMallCartAbandonmentMetrics>(abandonment);
    TestValidator.predicate(
      "segment abandonment cartAbandonmentRate within [0,1]",
      abandonment.cartAbandonmentRate >= 0 &&
        abandonment.cartAbandonmentRate <= 1,
    );

    const vf: IShoppingMallCartValidationFailureDistribution =
      segment.validationFailures;
    typia.assert<IShoppingMallCartValidationFailureDistribution>(vf);

    TestValidator.predicate(
      "segment validationFailures.totalValidationFailures non-negative",
      vf.totalValidationFailures >= 0,
    );

    const sumFailures = vf.byReason.reduce((sum, b) => sum + b.failureCount, 0);
    TestValidator.predicate(
      "segment byReason failureCount sum should not exceed totalValidationFailures",
      sumFailures <= vf.totalValidationFailures,
    );

    const anyTimeSeries: IShoppingMallCartFrictionTimeSeries | undefined =
      segment.timeSeries;
    if (anyTimeSeries !== undefined) {
      typia.assert<IShoppingMallCartFrictionTimeSeries>(anyTimeSeries);
      for (const bucket of anyTimeSeries.buckets) {
        typia.assert<IShoppingMallCartFrictionTimeSeriesBucket>(bucket);
      }
    }
  }

  // Overall-level checks
  const overall: IShoppingMallCartFrictionAnalyticsOverall = analytics.overall;
  typia.assert<IShoppingMallCartFrictionAnalyticsOverall>(overall);

  const overallCarts: IShoppingMallCartCounts = overall.carts;
  typia.assert<IShoppingMallCartCounts>(overallCarts);
  TestValidator.predicate(
    "overall carts.totalCarts non-negative",
    overallCarts.totalCarts >= 0,
  );

  const overallVF: IShoppingMallCartValidationFailureDistribution =
    overall.validationFailures;
  typia.assert<IShoppingMallCartValidationFailureDistribution>(overallVF);

  TestValidator.predicate(
    "overall validationFailures.totalValidationFailures non-negative",
    overallVF.totalValidationFailures >= 0,
  );

  const overallFailuresSum = overallVF.byReason.reduce(
    (sum, b) => sum + b.failureCount,
    0,
  );
  TestValidator.predicate(
    "overall byReason failureCount sum should not exceed totalValidationFailures",
    overallFailuresSum <= overallVF.totalValidationFailures,
  );
}
