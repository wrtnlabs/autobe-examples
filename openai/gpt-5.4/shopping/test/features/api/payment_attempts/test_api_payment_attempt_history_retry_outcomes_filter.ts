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

export async function test_api_payment_attempt_history_retry_outcomes_filter(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);
  const now: Date = new Date();
  const createdRangeFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const createdRangeTo: string = now.toISOString();
  const processedRangeFrom: string = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const processedRangeTo: string = now.toISOString();
  const failedRequest = {
    status: "failed",
    page: 1,
    limit: 20,
    sort: "-created_at",
  } satisfies IShoppingMallPaymentAttempt.IRequest;
  const failedPage: IPageIShoppingMallPaymentAttempt.ISummary =
    await api.functional.shoppingMall.customer.paymentAttempts.index(
      customerConnection,
      {
        body: failedRequest,
      },
    );
  typia.assert<IPageIShoppingMallPaymentAttempt.ISummary>(failedPage);
  TestValidator.equals("failed page current", failedPage.pagination.current, 1);
  TestValidator.equals("failed page limit", failedPage.pagination.limit, 20);
  TestValidator.predicate(
    "failed page records non-negative",
    failedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "failed page pages non-negative",
    failedPage.pagination.pages >= 0,
  );
  failedPage.data.forEach((attempt) => {
    TestValidator.equals("failed filter status", attempt.status, "failed");
  });
  TestValidator.equals(
    "failed page ids remain distinct",
    new Set(failedPage.data.map((attempt) => attempt.id)).size,
    failedPage.data.length,
  );
  const succeededRequest = {
    status: "succeeded",
    page: 1,
    limit: 20,
    sort: "-created_at",
  } satisfies IShoppingMallPaymentAttempt.IRequest;
  const succeededPage: IPageIShoppingMallPaymentAttempt.ISummary =
    await api.functional.shoppingMall.customer.paymentAttempts.index(
      customerConnection,
      {
        body: succeededRequest,
      },
    );
  typia.assert<IPageIShoppingMallPaymentAttempt.ISummary>(succeededPage);
  TestValidator.equals(
    "succeeded page current",
    succeededPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "succeeded page limit",
    succeededPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "succeeded page records non-negative",
    succeededPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "succeeded page pages non-negative",
    succeededPage.pagination.pages >= 0,
  );
  succeededPage.data.forEach((attempt) => {
    TestValidator.equals(
      "succeeded filter status",
      attempt.status,
      "succeeded",
    );
  });
  TestValidator.equals(
    "succeeded page ids remain distinct",
    new Set(succeededPage.data.map((attempt) => attempt.id)).size,
    succeededPage.data.length,
  );
  const gatewayProvider: string =
    failedPage.data[0]?.gateway_provider ??
    succeededPage.data[0]?.gateway_provider ??
    RandomGenerator.alphabets(8);
  const filteredRequest = {
    gatewayProvider,
    minimumAmount: 0,
    maximumAmount: 1000000,
    createdAtFrom: createdRangeFrom,
    createdAtTo: createdRangeTo,
    processedAtFrom: processedRangeFrom,
    processedAtTo: processedRangeTo,
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IShoppingMallPaymentAttempt.IRequest;
  const gatewayFilteredPage: IPageIShoppingMallPaymentAttempt.ISummary =
    await api.functional.shoppingMall.customer.paymentAttempts.index(
      customerConnection,
      {
        body: filteredRequest,
      },
    );
  typia.assert<IPageIShoppingMallPaymentAttempt.ISummary>(gatewayFilteredPage);
  TestValidator.equals(
    "gateway filtered page current",
    gatewayFilteredPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "gateway filtered page limit",
    gatewayFilteredPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "gateway filtered page records non-negative",
    gatewayFilteredPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "gateway filtered page pages non-negative",
    gatewayFilteredPage.pagination.pages >= 0,
  );
  gatewayFilteredPage.data.forEach((attempt) => {
    TestValidator.equals(
      "gateway provider matches",
      attempt.gateway_provider,
      gatewayProvider,
    );
    TestValidator.predicate("amount within minimum", attempt.amount >= 0);
    TestValidator.predicate("amount within maximum", attempt.amount <= 1000000);
    TestValidator.predicate(
      "created_at lower bound",
      new Date(attempt.created_at).getTime() >=
        new Date(createdRangeFrom).getTime(),
    );
    TestValidator.predicate(
      "created_at upper bound",
      new Date(attempt.created_at).getTime() <=
        new Date(createdRangeTo).getTime(),
    );
    TestValidator.predicate(
      "processed_at exists for processed range",
      attempt.processed_at !== null,
    );
    if (attempt.processed_at !== null) {
      TestValidator.predicate(
        "processed_at lower bound",
        new Date(attempt.processed_at).getTime() >=
          new Date(processedRangeFrom).getTime(),
      );
      TestValidator.predicate(
        "processed_at upper bound",
        new Date(attempt.processed_at).getTime() <=
          new Date(processedRangeTo).getTime(),
      );
    }
  });
  TestValidator.equals(
    "gateway filtered ids remain distinct",
    new Set(gatewayFilteredPage.data.map((attempt) => attempt.id)).size,
    gatewayFilteredPage.data.length,
  );
  failedPage.data.forEach((attempt) => {
    TestValidator.notEquals(
      "failed page excludes succeeded status",
      attempt.status,
      "succeeded",
    );
  });
  succeededPage.data.forEach((attempt) => {
    TestValidator.notEquals(
      "succeeded page excludes failed status",
      attempt.status,
      "failed",
    );
  });
}
