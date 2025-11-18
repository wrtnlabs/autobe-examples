import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCampaignMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignMetric";

/**
 * Verify that an authenticated admin receives a not-found style error when
 * requesting a non-existent campaign metric by ID.
 *
 * Business intent
 *
 * - Ensure that even fully authorized admin actors cannot retrieve non-existent
 *   analytics snapshots.
 * - Confirm that the campaign metric detail endpoint correctly signals missing
 *   resources instead of returning bogus data.
 *
 * Steps
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context.
 * 2. Generate a syntactically valid random UUID as a campaignMetricId that is
 *    extremely unlikely to exist.
 * 3. Invoke GET /shoppingMall/admin/analytics/campaignMetrics/{campaignMetricId}
 *    as the authenticated admin.
 * 4. Assert that the call fails with an HTTP error using TestValidator.error,
 *    without checking specific status codes.
 * 5. Ensure that no IShoppingMallCampaignMetric instance is produced from this
 *    failing call.
 */
export async function test_api_admin_campaign_metric_get_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Prepare a random UUID for a non-existent campaign metric id
  const missingCampaignMetricId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Call the detail endpoint and assert a generic HTTP error occurs
  await TestValidator.error(
    "admin requesting non-existent campaign metric should result in error",
    async () => {
      await api.functional.shoppingMall.admin.analytics.campaignMetrics.at(
        connection,
        {
          campaignMetricId: missingCampaignMetricId,
        },
      );
    },
  );

  // 5. There must be no successful IShoppingMallCampaignMetric produced;
  //    this is implicitly guaranteed because the above assertion only
  //    passes when an error is thrown.
}
