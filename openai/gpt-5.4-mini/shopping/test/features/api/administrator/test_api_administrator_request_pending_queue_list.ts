import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_pending_queue_list(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const request: IShoppingMallAdministratorRequest.IRequest = {
    status: "pending",
    applicantType: null,
    keyword: null,
    page: 1,
    limit: 10,
    sort: "created_at",
    order: "desc",
  };
  const first =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      administratorConnection,
      {
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      administratorConnection,
      {
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pending queue response is stable across repeated reads",
    second,
    first,
  );
  TestValidator.equals("pagination page", first.pagination.current, 1);
  TestValidator.equals("pagination limit", first.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data is at most requested limit",
    first.data.length <= first.pagination.limit,
  );
  for (const item of first.data) {
    TestValidator.equals("request status is pending", item.status, "pending");
    TestValidator.predicate("request id exists", item.id.length > 0);
    TestValidator.predicate("request reason exists", item.reason.length > 0);
    TestValidator.predicate(
      "request created_at exists",
      item.created_at.length > 0,
    );
    TestValidator.predicate(
      "request updated_at exists",
      item.updated_at.length > 0,
    );
    TestValidator.equals(
      "rejected reason absent for pending queue",
      item.rejected_reason,
      null,
    );
  }
  for (let i = 1; i < first.data.length; i++) {
    TestValidator.predicate(
      "pending queue ordered newest first",
      first.data[i - 1].created_at >= first.data[i].created_at,
    );
  }
}
