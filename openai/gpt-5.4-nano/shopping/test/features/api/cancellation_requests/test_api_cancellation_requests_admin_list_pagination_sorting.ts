import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_requests_admin_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = { ...(adminConnection.headers ?? {}) };
  const page = 1 satisfies number;
  const limit = 25 satisfies number;
  const request = {
    page,
    limit,
    sortBy: "created_at",
    sortDirection: "desc",
    includeDeleted: false,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  const output =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.index(
      actorConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  const { pagination, data } = output;
  TestValidator.equals("pagination current", pagination.current, page);
  TestValidator.equals("pagination limit", pagination.limit, limit);
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals("pagination pages", pagination.pages, expectedPages);
  TestValidator.predicate(
    "data length within limit",
    data.length <= pagination.limit,
  );
  if (data.length >= 2) {
    const parsed = data.map((x) => Date.parse(x.created_at));
    for (let i = 1; i < parsed.length; i++) {
      TestValidator.predicate(
        `created_at desc order at index ${i}`,
        parsed[i - 1] >= parsed[i],
      );
    }
  }
}
