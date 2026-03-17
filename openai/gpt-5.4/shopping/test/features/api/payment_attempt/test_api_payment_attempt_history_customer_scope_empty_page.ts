import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentAttempt";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_payment_attempt_history_customer_scope_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);
  const request = {
    status: RandomGenerator.alphaNumeric(12),
    gatewayProvider: RandomGenerator.alphaNumeric(12),
    minimumAmount: 1000000,
    maximumAmount: 1000001,
    createdAtFrom: new Date("2100-01-01T00:00:00.000Z").toISOString(),
    createdAtTo: new Date("2100-01-02T00:00:00.000Z").toISOString(),
    processedAtFrom: new Date("2100-01-01T00:00:00.000Z").toISOString(),
    processedAtTo: new Date("2100-01-02T00:00:00.000Z").toISOString(),
    page: 1,
    limit: 10,
  } satisfies IShoppingMallPaymentAttempt.IRequest;
  const firstPage =
    await api.functional.shoppingMall.customer.paymentAttempts.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert<IPageIShoppingMallPaymentAttempt.ISummary>(firstPage);
  TestValidator.equals(
    "empty data returned for fresh customer",
    firstPage.data.length,
    0,
  );
  TestValidator.equals(
    "zero matching records",
    firstPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages when no records",
    firstPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page reflects request",
    firstPage.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "limit reflects request",
    firstPage.pagination.limit,
    request.limit ?? 10,
  );
  const secondPage =
    await api.functional.shoppingMall.customer.paymentAttempts.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert<IPageIShoppingMallPaymentAttempt.ISummary>(secondPage);
  TestValidator.equals(
    "repeat search remains read-only and stable",
    secondPage,
    firstPage,
  );
}
