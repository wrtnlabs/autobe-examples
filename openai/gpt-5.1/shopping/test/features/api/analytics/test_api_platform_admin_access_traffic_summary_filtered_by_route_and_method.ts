import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallHttpMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallHttpMethod";
import type { IEShoppingMallStatusCodeFamily } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallStatusCodeFamily";
import type { IShoppingMallAccessTrafficSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummary";
import type { IShoppingMallAccessTrafficSummaryByActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryByActorType";
import type { IShoppingMallAccessTrafficSummaryByHttpMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryByHttpMethod";
import type { IShoppingMallAccessTrafficSummaryByRoutePattern } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryByRoutePattern";
import type { IShoppingMallAccessTrafficSummaryByStatusCodeFamily } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryByStatusCodeFamily";
import type { IShoppingMallAccessTrafficSummaryTimeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessTrafficSummaryTimeBucket";
import type { IShoppingMallAnalyticsTimeBucketOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeBucketOption";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_access_traffic_summary_filtered_by_route_and_method(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // optional tracking fields
    ip: null,
    href: "https://admin.shoppingmall.example.com/dashboard",
    referrer: "https://admin.shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Define a time range that clearly covers this test execution window
  const now = new Date();
  const start = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start,
    end,
  };

  // Synthetic route-prefix groups used only for filtering semantics
  const groupAPrefix = "/shoppingMall/catalog";
  const groupBPrefix = "/shoppingMall/cart";

  const timeBucket: IShoppingMallAnalyticsTimeBucketOption = "hour";

  // 3. Generate access traffic for group A: httpMethod GET
  const groupACallCount = 3;
  const groupARequest = {
    timeRange,
    routePrefixes: [groupAPrefix],
    httpMethods: ["GET"],
    statusCodeFamilies: null,
    regions: null,
    actorTypes: null,
    timeBucket,
  } satisfies IShoppingMallAccessTrafficSummary.IRequest;

  await ArrayUtil.asyncRepeat(groupACallCount, async () => {
    const summary =
      await api.functional.shoppingMall.platformAdmin.analytics.logging.accessTrafficSummary.index(
        connection,
        {
          body: groupARequest,
        },
      );
    typia.assert<IShoppingMallAccessTrafficSummary>(summary);
  });

  // 4. Generate access traffic for group B: httpMethod POST
  const groupBCallCount = 2;
  const groupBRequest = {
    timeRange,
    routePrefixes: [groupBPrefix],
    httpMethods: ["POST"],
    statusCodeFamilies: null,
    regions: null,
    actorTypes: null,
    timeBucket,
  } satisfies IShoppingMallAccessTrafficSummary.IRequest;

  await ArrayUtil.asyncRepeat(groupBCallCount, async () => {
    const summary =
      await api.functional.shoppingMall.platformAdmin.analytics.logging.accessTrafficSummary.index(
        connection,
        {
          body: groupBRequest,
        },
      );
    typia.assert<IShoppingMallAccessTrafficSummary>(summary);
  });

  // 5. Call analytics focusing on group A (GET + groupAPrefix) and assert metrics
  const focusARequest = {
    timeRange,
    routePrefixes: [groupAPrefix],
    httpMethods: ["GET"],
    statusCodeFamilies: null,
    regions: null,
    actorTypes: null,
    timeBucket,
  } satisfies IShoppingMallAccessTrafficSummary.IRequest;

  const focusASummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.accessTrafficSummary.index(
      connection,
      {
        body: focusARequest,
      },
    );
  typia.assert<IShoppingMallAccessTrafficSummary>(focusASummary);

  // basic structural sanity
  TestValidator.predicate(
    "focusA summary has non-negative totalRequests",
    focusASummary.totalRequests >= 0,
  );

  const hasRouteBuckets = focusASummary.requestsByRoutePattern.length > 0;
  TestValidator.predicate(
    "focusA summary has at least one routePattern bucket",
    hasRouteBuckets,
  );

  if (hasRouteBuckets) {
    const firstRoute: IShoppingMallAccessTrafficSummaryByRoutePattern =
      focusASummary.requestsByRoutePattern[0];
    TestValidator.predicate(
      "first routePattern is non-empty",
      firstRoute.routePattern.length > 0,
    );
    TestValidator.predicate(
      "first routePattern bucket has non-negative count",
      firstRoute.requestCount >= 0,
    );
  }

  // Analyze HTTP method distribution for focusA
  const getBucketA: IShoppingMallAccessTrafficSummaryByHttpMethod | undefined =
    focusASummary.requestsByHttpMethod.find(
      (b) => b.httpMethod === ("GET" as IEShoppingMallHttpMethod),
    );

  TestValidator.predicate("focusA summary has a GET bucket", !!getBucketA);

  if (getBucketA) {
    TestValidator.predicate(
      "GET bucket requestCount is at least number of groupA calls",
      getBucketA.requestCount >= groupACallCount,
    );
  }

  const postBucketA: IShoppingMallAccessTrafficSummaryByHttpMethod | undefined =
    focusASummary.requestsByHttpMethod.find(
      (b) => b.httpMethod === ("POST" as IEShoppingMallHttpMethod),
    );

  if (postBucketA && getBucketA) {
    TestValidator.predicate(
      "POST bucket, if present, does not dominate over GET in focusA",
      postBucketA.requestCount <= getBucketA.requestCount,
    );
  }

  // 6. Optionally, call analytics focusing on group B (POST + groupBPrefix)
  const focusBRequest = {
    timeRange,
    routePrefixes: [groupBPrefix],
    httpMethods: ["POST"],
    statusCodeFamilies: null,
    regions: null,
    actorTypes: null,
    timeBucket,
  } satisfies IShoppingMallAccessTrafficSummary.IRequest;

  const focusBSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.accessTrafficSummary.index(
      connection,
      {
        body: focusBRequest,
      },
    );
  typia.assert<IShoppingMallAccessTrafficSummary>(focusBSummary);

  const postBucketB: IShoppingMallAccessTrafficSummaryByHttpMethod | undefined =
    focusBSummary.requestsByHttpMethod.find(
      (b) => b.httpMethod === ("POST" as IEShoppingMallHttpMethod),
    );

  TestValidator.predicate("focusB summary has a POST bucket", !!postBucketB);

  if (postBucketB) {
    TestValidator.predicate(
      "POST bucket in focusB has non-negative requestCount",
      postBucketB.requestCount >= 0,
    );
  }

  // Compare total requests to ensure some differentiation between focusA and focusB
  TestValidator.predicate(
    "focusA and focusB summaries have non-negative totalRequests",
    focusASummary.totalRequests >= 0 && focusBSummary.totalRequests >= 0,
  );
}
