import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCampaignMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCampaignMetric";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCampaignMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignMetric";

/**
 * Verify that the campaign metrics detail endpoint is protected by admin
 * authorization.
 *
 * Business purpose:
 *
 * - Ensure that detailed campaign analytics data cannot be fetched by anonymous
 *   or unauthorized clients, even when they know a valid campaignMetricId.
 * - Confirm that admin-only analytics surfaces are correctly guarded by the
 *   authentication layer.
 *
 * Steps:
 *
 * 1. Admin bootstrap and metric discovery
 *
 *    - Call POST /auth/admin/join with a random-but-valid
 *         IShoppingMallAdminJoin.ICreate body to create a fresh admin and
 *         establish an authenticated connection with Authorization header
 *         managed by the SDK.
 *    - With the authenticated connection, call PATCH
 *         /shoppingMall/admin/analytics/campaignMetrics with a simple
 *         IShoppingMallCampaignMetric.IRequest filter to retrieve at least one
 *         campaign metrics summary page
 *         (IPageIShoppingMallCampaignMetric.ISummary).
 *    - From the returned page, pick one IShoppingMallCampaignMetric.ISummary and
 *         store its id as campaignMetricIdUnderTest.
 * 2. Simulate unauthenticated client and attempt detail access
 *
 *    - Construct a new connection object unauthenticatedConn using object spread
 *         from the original connection but overriding headers to an empty
 *         object (headers: {}), and then never modify
 *         unauthenticatedConn.headers again.
 *    - Using unauthenticatedConn, invoke GET
 *         /shoppingMall/admin/analytics/campaignMetrics/{campaignMetricId} via
 *         api.functional.shoppingMall.admin.analytics.campaignMetrics.at,
 *         passing the captured campaignMetricIdUnderTest.
 *    - Wrap this call in TestValidator.httpError with a descriptive title such as
 *         "unauthenticated campaign metric at() must be rejected" and assert
 *         that a 4xx client error occurs (e.g., 401 or 403). Since
 *         TestValidator.httpError accepts one or more explicit status codes,
 *         choose a conservative set like [401, 403, 404] if needed,
 *         understanding that exact semantics may vary but all represent
 *         non-successful, non-OK responses.
 * 3. Optional positive control (sanity check)
 *
 *    - Optionally, perform a final GET with the authenticated connection and the
 *         same campaignMetricIdUnderTest to verify that the metric can be
 *         fetched successfully when properly authorized. Use
 *         typia.assert<IShoppingMallCampaignMetric> on the response and a
 *         TestValidator.predicate assertion that ids match.
 *
 * Implementation constraints:
 *
 * - Do not import anything beyond what is already imported by the template.
 * - Do not touch or inspect connection.headers on the original authenticated
 *   connection; the SDK manages Authorization automatically.
 * - For request bodies, use inline object literals with `satisfies` instead of
 *   explicit type annotations.
 * - Avoid any tests that intentionally send type-invalid payloads or rely on
 *   compilation-time type errors.
 */
export async function test_api_admin_campaign_metric_get_by_id_authorization_required(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authenticated context
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Discover at least one campaign metric id using the authenticated connection
  const page =
    await api.functional.shoppingMall.admin.analytics.campaignMetrics.index(
      connection,
      {
        body: typia.random<IShoppingMallCampaignMetric.IRequest>(),
      },
    );
  typia.assert<IPageIShoppingMallCampaignMetric.ISummary>(page);

  TestValidator.predicate(
    "campaign metrics page should contain at least one summary",
    () => page.data.length > 0,
  );

  const metricSummary = page.data[0];
  typia.assert<IShoppingMallCampaignMetric.ISummary>(metricSummary);

  const campaignMetricIdUnderTest = metricSummary.id;

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to fetch campaign metric detail without auth and expect an HTTP error
  await TestValidator.httpError(
    "unauthenticated campaign metric at() must be rejected",
    [401, 403, 404],
    async () => {
      return await api.functional.shoppingMall.admin.analytics.campaignMetrics.at(
        unauthenticatedConn,
        {
          campaignMetricId: campaignMetricIdUnderTest,
        },
      );
    },
  );

  // 5. Positive control: same call should succeed with authenticated connection
  const metric =
    await api.functional.shoppingMall.admin.analytics.campaignMetrics.at(
      connection,
      {
        campaignMetricId: campaignMetricIdUnderTest,
      },
    );
  typia.assert<IShoppingMallCampaignMetric>(metric);

  TestValidator.equals(
    "authorized campaign metric at() should return the requested id",
    metric.id,
    campaignMetricIdUnderTest,
  );
}
