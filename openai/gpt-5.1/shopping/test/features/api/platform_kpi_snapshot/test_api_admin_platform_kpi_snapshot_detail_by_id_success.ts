import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformKpiSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpiSnapshot";

export async function test_api_admin_platform_kpi_snapshot_detail_by_id_success(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authorized admin context and token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create at least one analytics-related configuration
  const configBody = {
    namespace: "analytics",
    config_key: `platform-kpi-${RandomGenerator.alphaNumeric(8)}`,
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: '{"analytics":true}',
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Search for KPI snapshots to obtain at least one summary
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderBy: "period_start",
    orderDirection: "desc",
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const page: IPageIShoppingMallPlatformKpiSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.index(
      connection,
      {
        body: listRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallPlatformKpiSnapshot.ISummary>(page);
  typia.assert<IPage.IPagination>(page.pagination);

  // Ensure there is at least one KPI snapshot available
  TestValidator.predicate(
    "platform KPI snapshot list should contain at least one record",
    page.data.length > 0,
  );

  const summary: IShoppingMallPlatformKpiSnapshot.ISummary = page.data[0];
  typia.assert<IShoppingMallPlatformKpiSnapshot.ISummary>(summary);

  // 4. Retrieve detail by id using the summary id
  const detail: IShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.at(
      connection,
      {
        platformKpiSnapshotId: summary.id,
      },
    );
  typia.assert<IShoppingMallPlatformKpiSnapshot>(detail);

  // 5. Cross-check identity and core period fields
  TestValidator.equals(
    "detail.id should match summary.id",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "detail.period_type should match summary.period_type",
    detail.period_type,
    summary.period_type,
  );
  TestValidator.equals(
    "detail.period_start should match summary.period_start",
    detail.period_start,
    summary.period_start,
  );
  TestValidator.equals(
    "detail.period_end should match summary.period_end",
    detail.period_end,
    summary.period_end,
  );

  // 6. Cross-check shared KPI numeric fields between summary and detail
  TestValidator.equals(
    "detail.gmv_amount should match summary.gmv_amount",
    detail.gmv_amount,
    summary.gmv_amount,
  );
  TestValidator.equals(
    "detail.nmv_amount should match summary.nmv_amount",
    detail.nmv_amount,
    summary.nmv_amount,
  );
  TestValidator.equals(
    "detail.platform_revenue_amount should match summary.platform_revenue_amount",
    detail.platform_revenue_amount,
    summary.platform_revenue_amount,
  );
  TestValidator.equals(
    "detail.take_rate should match summary.take_rate",
    detail.take_rate,
    summary.take_rate,
  );
  TestValidator.equals(
    "detail.order_count should match summary.order_count",
    detail.order_count,
    summary.order_count,
  );
  TestValidator.equals(
    "detail.paid_order_count should match summary.paid_order_count",
    detail.paid_order_count,
    summary.paid_order_count,
  );
  TestValidator.equals(
    "detail.active_customer_count should match summary.active_customer_count",
    detail.active_customer_count,
    summary.active_customer_count,
  );
  TestValidator.equals(
    "detail.new_customer_count should match summary.new_customer_count",
    detail.new_customer_count,
    summary.new_customer_count,
  );
  TestValidator.equals(
    "detail.active_seller_count should match summary.active_seller_count",
    detail.active_seller_count,
    summary.active_seller_count,
  );
  TestValidator.equals(
    "detail.refund_request_count should match summary.refund_request_count",
    detail.refund_request_count,
    summary.refund_request_count,
  );
  TestValidator.equals(
    "detail.approved_refund_count should match summary.approved_refund_count",
    detail.approved_refund_count,
    summary.approved_refund_count,
  );
  TestValidator.equals(
    "detail.refunded_amount should match summary.refunded_amount",
    detail.refunded_amount,
    summary.refunded_amount,
  );
  TestValidator.equals(
    "detail.chargeback_count should match summary.chargeback_count",
    detail.chargeback_count,
    summary.chargeback_count,
  );
  TestValidator.equals(
    "detail.chargeback_amount should match summary.chargeback_amount",
    detail.chargeback_amount,
    summary.chargeback_amount,
  );
  TestValidator.equals(
    "detail.average_order_value should match summary.average_order_value",
    detail.average_order_value,
    summary.average_order_value,
  );

  // 7. Logical sanity checks on KPI numeric values
  TestValidator.predicate(
    "gmv_amount should be non-negative",
    detail.gmv_amount >= 0,
  );
  TestValidator.predicate(
    "nmv_amount should be non-negative",
    detail.nmv_amount >= 0,
  );
  TestValidator.predicate(
    "platform_revenue_amount should be non-negative",
    detail.platform_revenue_amount >= 0,
  );
  TestValidator.predicate(
    "take_rate should be non-negative",
    detail.take_rate >= 0,
  );
  TestValidator.predicate(
    "order_count should be non-negative",
    detail.order_count >= 0,
  );
  TestValidator.predicate(
    "paid_order_count should be non-negative",
    detail.paid_order_count >= 0,
  );
  TestValidator.predicate(
    "active_customer_count should be non-negative",
    detail.active_customer_count >= 0,
  );
  TestValidator.predicate(
    "new_customer_count should be non-negative",
    detail.new_customer_count >= 0,
  );
  TestValidator.predicate(
    "active_seller_count should be non-negative",
    detail.active_seller_count >= 0,
  );
  TestValidator.predicate(
    "refund_request_count should be non-negative",
    detail.refund_request_count >= 0,
  );
  TestValidator.predicate(
    "approved_refund_count should be non-negative",
    detail.approved_refund_count >= 0,
  );
  TestValidator.predicate(
    "refunded_amount should be non-negative",
    detail.refunded_amount >= 0,
  );
  TestValidator.predicate(
    "chargeback_count should be non-negative",
    detail.chargeback_count >= 0,
  );
  TestValidator.predicate(
    "chargeback_amount should be non-negative",
    detail.chargeback_amount >= 0,
  );
  TestValidator.predicate(
    "average_order_value should be non-negative",
    detail.average_order_value >= 0,
  );

  // Relationships between metrics
  TestValidator.predicate(
    "order_count should be greater than or equal to paid_order_count",
    detail.order_count >= detail.paid_order_count,
  );
  TestValidator.predicate(
    "nmv_amount should not exceed gmv_amount",
    detail.nmv_amount <= detail.gmv_amount,
  );
  TestValidator.predicate(
    "platform_revenue_amount should not exceed gmv_amount",
    detail.platform_revenue_amount <= detail.gmv_amount,
  );
  TestValidator.predicate(
    "take_rate should not be absurdly large (<= 1000)",
    detail.take_rate <= 1000,
  );
}
