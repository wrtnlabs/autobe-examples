import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_requests_admin_list_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const page = 1 as IShoppingMallRefundRequest.IRequest["page"];
  const limit = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const status = "pending";
  const body: IShoppingMallRefundRequest.IRequest = {
    page,
    limit,
    status,
    sellerComment: null,
    decisionedAt: null,
  };
  const res1 =
    await api.functional.shoppingMall.admin.admin.refund_requests.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(res1);
  TestValidator.equals("pagination.current", res1.pagination.current, page);
  TestValidator.predicate(
    "pagination.limit clamped within requested",
    res1.pagination.limit >= 0 && res1.pagination.limit <= limit,
  );
  TestValidator.predicate(
    "pagination.records non-negative",
    res1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages non-negative",
    res1.pagination.pages >= 0,
  );
  for (const item of res1.data) {
    typia.assert(item);
    TestValidator.equals("filter.status matches", item.status, status);
  }
  const res2 =
    await api.functional.shoppingMall.admin.admin.refund_requests.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(res2);
  TestValidator.equals(
    "same pagination.current",
    res2.pagination.current,
    res1.pagination.current,
  );
  TestValidator.equals(
    "same pagination.limit",
    res2.pagination.limit,
    res1.pagination.limit,
  );
  TestValidator.equals(
    "same pagination.records",
    res2.pagination.records,
    res1.pagination.records,
  );
  TestValidator.equals(
    "same pagination.pages",
    res2.pagination.pages,
    res1.pagination.pages,
  );
  TestValidator.equals("data immutable across fetches", res2.data, res1.data);
}
