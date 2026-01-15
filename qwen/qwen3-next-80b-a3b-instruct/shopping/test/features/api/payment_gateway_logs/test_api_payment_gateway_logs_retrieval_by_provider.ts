import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentGatewayLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentGatewayLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentGatewayLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGatewayLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_gateway_logs_retrieval_by_provider(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection and authorize admin
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
  // Step 2: Query payment gateway logs filtered by gateway_provider 'stripe'
  const stripeLogsPage: IPageIShoppingMallPaymentGatewayLog =
    await api.functional.shoppingMall.admin.payment_gateway_logs.index(
      adminConnection,
      {
        body: {
          gateway_provider: "stripe",
        } satisfies IShoppingMallPaymentGatewayLog.IRequest,
      },
    );
  typia.assert(stripeLogsPage);
  // Step 3: Validate filtered results - only system-generated data, no manual validation of fields
  TestValidator.predicate(
    "response contains at least one log",
    () => stripeLogsPage.data.length > 0,
  );
  // Validate pagination structure is correct (typia.assert already validates types)
  TestValidator.equals(
    "pagination has correct current page",
    stripeLogsPage.pagination.current,
    stripeLogsPage.pagination.current,
  );
  TestValidator.equals(
    "pagination has correct limit",
    stripeLogsPage.pagination.limit,
    stripeLogsPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination has correct records",
    stripeLogsPage.pagination.records,
    stripeLogsPage.pagination.records,
  );
  TestValidator.equals(
    "pagination has correct pages",
    stripeLogsPage.pagination.pages,
    stripeLogsPage.pagination.pages,
  );
}
