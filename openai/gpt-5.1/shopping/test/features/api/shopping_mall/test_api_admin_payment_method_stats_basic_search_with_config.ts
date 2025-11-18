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
import type { IShoppingMallPaymentMethodStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodStat";

export async function test_api_admin_payment_method_stats_basic_search_with_config(
  connection: api.IConnection,
) {
  // 1. Admin signs up (join) to obtain authorized admin context.
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

  // 2. Create a baseline global configuration row for analytics.
  const configCreateBody = {
    namespace: "analytics",
    config_key: "payment_stats_defaults",
    environment: "production",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({
      defaultWindowDays: 7,
      baseCurrency: "KRW",
      includeInactiveMethods: false,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configCreateBody,
    });
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config has expected namespace",
    createdConfig.namespace,
    configCreateBody.namespace,
  );
  TestValidator.equals(
    "created config has expected key",
    createdConfig.config_key,
    configCreateBody.config_key,
  );

  // 3. Build a recent date range for payment method stats query.
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const statsRequestBody = {
    fromDate: threeDaysAgo.toISOString(),
    toDate: now.toISOString(),
    // No explicit paymentMethodIds or paymentMethodCodes to exercise default behavior.
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    orderBy: "stats_date",
    orderDirection: "desc",
  } satisfies IShoppingMallPaymentMethodStat.IRequest;

  const pageSummary: IPageIShoppingMallPaymentMethodStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.paymentMethodStats.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(pageSummary);

  // 4. Validate pagination basics.
  TestValidator.equals(
    "pagination current page should be 1",
    pageSummary.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    pageSummary.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    pageSummary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pageSummary.pagination.pages >= 0,
  );

  // 5. If any stats exist, perform additional structural and business checks
  // on the first row.
  if (pageSummary.data.length > 0) {
    const first: IShoppingMallPaymentMethodStat.ISummary = pageSummary.data[0];
    typia.assert<IShoppingMallPaymentMethodStat.ISummary>(first);

    TestValidator.predicate(
      "payment_attempt_count should be non-negative",
      first.payment_attempt_count >= 0,
    );
    TestValidator.predicate(
      "payment_success_count should be non-negative",
      first.payment_success_count >= 0,
    );
    TestValidator.predicate(
      "payment_failure_count should be non-negative",
      first.payment_failure_count >= 0,
    );
    TestValidator.predicate(
      "payment_expired_count should be non-negative",
      first.payment_expired_count >= 0,
    );
    TestValidator.predicate(
      "paid_gmv_amount should be non-negative",
      first.paid_gmv_amount >= 0,
    );
    TestValidator.predicate(
      "refunded_amount should be non-negative",
      first.refunded_amount >= 0,
    );
    TestValidator.predicate(
      "chargeback_amount should be non-negative",
      first.chargeback_amount >= 0,
    );
  }
}
