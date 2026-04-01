import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_filter_and_paginate(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstPage = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "-createdAt",
      } satisfies IMallPlatformCustomerSession.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination metadata is non-negative",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  TestValidator.equals("requested first page", firstPage.pagination.current, 1);
  TestValidator.equals("requested limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "data length does not exceed page limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const emptyPageNumber = firstPage.pagination.pages + 1;
  const emptyPage = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: emptyPageNumber,
        limit: 10,
        sort: "-createdAt",
      } satisfies IMallPlatformCustomerSession.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page current number",
    emptyPage.pagination.current,
    emptyPageNumber,
  );
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 10);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  TestValidator.equals(
    "empty page records mirror first page records",
    emptyPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "empty page total pages mirror first page pages",
    emptyPage.pagination.pages,
    firstPage.pagination.pages,
  );
  const filteredPage =
    await api.functional.mallPlatform.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
          createdAtFrom: authorized.createdAt,
          createdAtTo: authorized.updatedAt,
          expiredAtFrom: authorized.createdAt,
          expiredAtTo: authorized.updatedAt,
        } satisfies IMallPlatformCustomerSession.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered page remains within pagination bounds",
    filteredPage.data.length <= filteredPage.pagination.limit,
  );
  TestValidator.equals(
    "filtered page current number",
    filteredPage.pagination.current,
    1,
  );
}
