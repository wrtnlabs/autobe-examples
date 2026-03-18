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

export async function test_api_refund_requests_admin_list_empty_result_no_error(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const page: IShoppingMallRefundRequest.IRequest["page"] = 1 as any;
  const limit: IShoppingMallRefundRequest.IRequest["limit"] = 10 as any;
  const nonExistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const nonSeededStatus = RandomGenerator.alphabets(12);
  const body = {
    page: page!,
    limit: limit!,
    shoppingMallOrderItemId: nonExistentOrderItemId,
    status: nonSeededStatus,
    customerReason: RandomGenerator.paragraph({ sentences: 2 }),
    sellerComment: null,
    decisionedAt: null,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const first =
    await api.functional.shoppingMall.admin.admin.refund_requests.index(
      adminConnection,
      { body },
    );
  typia.assert(first);
  TestValidator.equals("refund requests empty", first.data.length, 0);
  TestValidator.equals("pagination.records is 0", first.pagination.records, 0);
  TestValidator.equals("pagination.pages is 0", first.pagination.pages, 0);
  TestValidator.equals(
    "pagination.current matches request",
    first.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit matches request",
    first.pagination.limit,
    limit,
  );
  const second =
    await api.functional.shoppingMall.admin.admin.refund_requests.index(
      adminConnection,
      { body },
    );
  typia.assert(second);
  TestValidator.equals("data remains empty (repeat)", second.data.length, 0);
  TestValidator.equals(
    "pagination.records remains 0 (repeat)",
    second.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages remains 0 (repeat)",
    second.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination.current matches request (repeat)",
    second.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit matches request (repeat)",
    second.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination stable",
    second.pagination,
    first.pagination,
  );
}
