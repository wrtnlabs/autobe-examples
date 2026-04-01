import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_accounts_browse_summaries(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  customerConnection.headers = {
    ...(customerConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const request = {
    search: typia.random<string & tags.Format<"email">>(),
    page: 1,
    limit: 10,
  } satisfies IMallPlatformSellerAccount.IRequest;
  const output = await api.functional.mallPlatform.customer.accounts.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "requested page reflected",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit reflected",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination counts are non-negative",
    output.pagination.records >= 0 && output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length respects limit",
    output.data.length <= output.pagination.limit,
  );
  const uniqueIds = new Set<string>();
  for (const record of output.data) {
    TestValidator.predicate("summary id is unique", !uniqueIds.has(record.id));
    uniqueIds.add(record.id);
    typia.assert(record);
  }
  const overflowPage =
    await api.functional.mallPlatform.customer.accounts.index(
      customerConnection,
      {
        body: {
          search: request.search,
          page: 9999,
          limit: request.limit,
        } satisfies IMallPlatformSellerAccount.IRequest,
      },
    );
  typia.assert(overflowPage);
  TestValidator.equals(
    "overflow page returns empty data",
    overflowPage.data.length,
    0,
  );
  TestValidator.equals(
    "overflow page current reflected",
    overflowPage.pagination.current,
    9999,
  );
  TestValidator.equals(
    "overflow page limit preserved",
    overflowPage.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "overflow page record count preserved",
    overflowPage.pagination.records,
    output.pagination.records,
  );
  TestValidator.equals(
    "overflow page total pages preserved",
    overflowPage.pagination.pages,
    output.pagination.pages,
  );
  const firstPageIds = output.data.map((record) => record.id);
  const overflowIds = overflowPage.data.map((record) => record.id);
  for (const id of overflowIds) {
    TestValidator.predicate(
      "overflow page does not duplicate first page ids",
      !firstPageIds.includes(id),
    );
  }
}
