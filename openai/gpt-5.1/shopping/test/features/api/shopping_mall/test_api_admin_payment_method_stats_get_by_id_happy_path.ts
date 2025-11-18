import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethodStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethodStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodStat";

/**
 * Happy-path drill-down of payment method statistics for an admin.
 *
 * Business goal: Ensure that an authenticated admin can:
 *
 * 1. Join the platform and obtain an authorized context.
 * 2. Create at least one analytics-related configuration row.
 * 3. Search payment method statistics to get a summary row.
 * 4. Use the summary row's id to fetch the full statistics snapshot by ID.
 * 5. Verify that the detailed snapshot is schema-valid and consistent with the
 *    summary row.
 *
 * Steps:
 *
 * 1. Call POST /auth/admin/join to register/login an admin (join).
 * 2. Call POST /shoppingMall/admin/configs to create an active analytics
 *    configuration.
 * 3. Call PATCH /shoppingMall/admin/analytics/paymentMethodStats (index/search)
 *    with broad filters and page=1, limit=1.
 * 4. Ensure at least one summary row is returned; extract its id.
 * 5. Call GET
 *    /shoppingMall/admin/analytics/paymentMethodStats/{paymentMethodStatId}
 *    with the extracted id.
 * 6. Assert identity and metric consistency between summary and detail, and that
 *    the detail has a populated paymentMethod.
 */
export async function test_api_admin_payment_method_stats_get_by_id_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
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
  typia.assert(adminAuthorized);

  // 2. Create an analytics-related config row
  const configBody = {
    namespace: "analytics.paymentMethodStats",
    config_key: "default-window",
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({ defaultWindowDays: 30 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert(createdConfig);

  // 3. Search payment method statistics (index) with page=1, limit=1
  const searchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPaymentMethodStat.IRequest;

  const pageResult: IPageIShoppingMallPaymentMethodStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.paymentMethodStats.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  // 4. Ensure at least one summary row exists and extract its id
  TestValidator.predicate(
    "payment method stats search must return at least one row",
    pageResult.data.length > 0,
  );

  const summary: IShoppingMallPaymentMethodStat.ISummary = pageResult.data[0];

  // 5. Retrieve the detailed snapshot by ID
  const detail: IShoppingMallPaymentMethodStat =
    await api.functional.shoppingMall.admin.analytics.paymentMethodStats.at(
      connection,
      { paymentMethodStatId: summary.id },
    );
  typia.assert(detail);

  // 6. Cross-validate summary vs. detail and paymentMethod linkage
  TestValidator.equals(
    "stat id must match between summary and detail",
    detail.id,
    summary.id,
  );

  TestValidator.equals(
    "stats_date must match between summary and detail",
    detail.stats_date,
    summary.stats_date,
  );

  TestValidator.equals(
    "payment_method_code must match between summary and detail",
    detail.payment_method_code,
    summary.payment_method_code,
  );

  TestValidator.equals(
    "payment_attempt_count must match between summary and detail",
    detail.payment_attempt_count,
    summary.payment_attempt_count,
  );

  TestValidator.equals(
    "payment_success_count must match between summary and detail",
    detail.payment_success_count,
    summary.payment_success_count,
  );

  TestValidator.equals(
    "payment_failure_count must match between summary and detail",
    detail.payment_failure_count,
    summary.payment_failure_count,
  );

  TestValidator.equals(
    "payment_expired_count must match between summary and detail",
    detail.payment_expired_count,
    summary.payment_expired_count,
  );

  TestValidator.equals(
    "paid_gmv_amount must match between summary and detail",
    detail.paid_gmv_amount,
    summary.paid_gmv_amount,
  );

  TestValidator.equals(
    "refunded_amount must match between summary and detail",
    detail.refunded_amount,
    summary.refunded_amount,
  );

  TestValidator.equals(
    "chargeback_amount must match between summary and detail",
    detail.chargeback_amount,
    summary.chargeback_amount,
  );

  // Validate that paymentMethod object is logically consistent with stats
  TestValidator.equals(
    "paymentMethod.code must match payment_method_code",
    detail.paymentMethod.code,
    detail.payment_method_code,
  );
}
