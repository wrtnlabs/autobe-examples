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

export async function test_api_payment_attempt_history_customer_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: (RandomGenerator.alphaNumeric(16) +
        "Aa1!") satisfies string as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  const request = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallPaymentAttempt.IRequest;
  const firstPage =
    await api.functional.shoppingMall.customer.paymentAttempts.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.shoppingMall.customer.paymentAttempts.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "same returned row count on repeated browse",
    firstPage.data.length,
    secondPage.data.length,
  );
  TestValidator.equals(
    "same row ids on repeated browse",
    firstPage.data.map((row) => row.id),
    secondPage.data.map((row) => row.id),
  );
  TestValidator.predicate(
    "pagination current starts from first page or later",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit covers returned rows",
    firstPage.pagination.limit >= firstPage.data.length,
  );
  TestValidator.predicate(
    "pagination records cover returned rows",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  firstPage.data.forEach((row, index) => {
    TestValidator.equals(
      `row ${index} is not logically deleted`,
      row.deleted_at,
      null,
    );
    TestValidator.predicate(
      `row ${index} created_at parses to valid date`,
      Number.isNaN(Date.parse(row.created_at)) === false,
    );
    TestValidator.predicate(
      `row ${index} updated_at parses to valid date`,
      Number.isNaN(Date.parse(row.updated_at)) === false,
    );
    if (row.processed_at !== null) {
      TestValidator.predicate(
        `row ${index} processed_at parses to valid date when present`,
        Number.isNaN(Date.parse(row.processed_at)) === false,
      );
    }
  });
  for (let i = 1; i < firstPage.data.length; ++i) {
    const previous = firstPage.data[i - 1];
    const current = firstPage.data[i];
    TestValidator.predicate(
      `default ordering keeps newer created_at first between rows ${i - 1} and ${i}`,
      Date.parse(previous.created_at) >= Date.parse(current.created_at),
    );
  }
}
