import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_filtered_results(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    search: RandomGenerator.alphabets(5),
    createdAtFrom: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    createdAtTo: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies IMallPlatformOrder.IRequest;
  const output =
    await api.functional.mallPlatform.customer.orders.history.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page should match request",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    output.pagination.limit,
    request.limit ?? 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  for (let i = 1; i < output.data.length; ++i) {
    TestValidator.predicate(
      "filtered order history should be newest first",
      output.data[i - 1].createdAt >= output.data[i].createdAt,
    );
  }
  const emptyRequest = {
    search: RandomGenerator.alphabets(20),
    createdAtFrom: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 365,
    ).toISOString(),
    createdAtTo: new Date(Date.now() - 1000 * 60 * 60 * 24 * 364).toISOString(),
    page: 1,
    limit: 10,
  } satisfies IMallPlatformOrder.IRequest;
  const emptyOutput =
    await api.functional.mallPlatform.customer.orders.history.index(
      customerConnection,
      {
        body: emptyRequest,
      },
    );
  typia.assert(emptyOutput);
  TestValidator.equals(
    "empty filtered result should return no records",
    emptyOutput.data.length,
    0,
  );
  TestValidator.equals(
    "empty filtered result should have zero records",
    emptyOutput.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filtered result should have zero pages",
    emptyOutput.pagination.pages,
    0,
  );
}
