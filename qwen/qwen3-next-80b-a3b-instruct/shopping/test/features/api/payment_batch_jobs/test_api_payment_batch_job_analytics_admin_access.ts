import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentBatchJobErrorCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobErrorCategories";
import type { IShoppingMallPaymentBatchJobSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobSummary";
import type { IShoppingMallPaymentBatchJobTypeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobTypeSummary";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_batch_job_analytics_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Test successful admin access (only possible scenario given available APIs)
  const summary: IShoppingMallPaymentBatchJobSummary =
    await api.functional.shoppingMall.analytics.payment_batch_jobs.index(
      adminConnection,
    );
  typia.assert(summary);
}
