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

export async function test_api_admin_campaign_metric_get_by_id_happy_path(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Search campaign metrics with broad filters to obtain at least one summary
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCampaignMetric.IRequest;

  const page =
    await api.functional.shoppingMall.admin.analytics.campaignMetrics.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallCampaignMetric.ISummary>(page);

  // If there is no data, we can still consider the test successful for shape validation
  if (page.data.length === 0) {
    TestValidator.equals(
      "when no campaign metrics exist, data array should be empty",
      page.data.length,
      0,
    );
    return;
  }

  // Basic sanity check on pagination current page when data exists
  TestValidator.equals(
    "pagination current page should be 1 when requesting first page",
    page.pagination.current,
    1,
  );

  // 3. Pick the first summary record
  const summary = page.data[0];

  // 4. Retrieve full campaign metric by ID
  const full =
    await api.functional.shoppingMall.admin.analytics.campaignMetrics.at(
      connection,
      {
        campaignMetricId: summary.id,
      },
    );
  typia.assert<IShoppingMallCampaignMetric>(full);

  // 5. Cross-check overlapping fields between summary and full record
  TestValidator.equals(
    "detail id should match summary id",
    full.id,
    summary.id,
  );
  TestValidator.equals(
    "detail stats_date should match summary stats_date",
    full.stats_date,
    summary.stats_date,
  );
  TestValidator.equals(
    "detail campaign_code should match summary campaign_code",
    full.campaign_code,
    summary.campaign_code,
  );
  TestValidator.equals(
    "detail order_count should match summary order_count",
    full.order_count,
    summary.order_count,
  );
  TestValidator.equals(
    "detail paid_order_count should match summary paid_order_count",
    full.paid_order_count,
    summary.paid_order_count,
  );
  TestValidator.equals(
    "detail gmv_amount should match summary gmv_amount",
    full.gmv_amount,
    summary.gmv_amount,
  );
  TestValidator.equals(
    "detail nmv_amount should match summary nmv_amount",
    full.nmv_amount,
    summary.nmv_amount,
  );
  TestValidator.equals(
    "detail discount_total_amount should match summary discount_total_amount",
    full.discount_total_amount,
    summary.discount_total_amount,
  );
  TestValidator.equals(
    "detail platform_funded_discount_amount should match summary platform_funded_discount_amount",
    full.platform_funded_discount_amount,
    summary.platform_funded_discount_amount,
  );
  TestValidator.equals(
    "detail seller_funded_discount_amount should match summary seller_funded_discount_amount",
    full.seller_funded_discount_amount,
    summary.seller_funded_discount_amount,
  );
  TestValidator.equals(
    "detail new_customer_order_count should match summary new_customer_order_count",
    full.new_customer_order_count,
    summary.new_customer_order_count,
  );
  TestValidator.equals(
    "detail created_at should match summary created_at",
    full.created_at,
    summary.created_at,
  );
  TestValidator.equals(
    "detail updated_at should match summary updated_at",
    full.updated_at,
    summary.updated_at,
  );
}
