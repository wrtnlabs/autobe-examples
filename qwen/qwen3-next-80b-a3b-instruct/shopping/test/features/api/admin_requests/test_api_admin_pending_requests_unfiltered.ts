import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_pending_requests_unfiltered(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Retrieve unfiltered pending requests page
  const requestsPage =
    await api.functional.shoppingMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdminAction.IRequest,
      },
    );
  typia.assert(requestsPage);
  // Validate pagination structure
  TestValidator.equals("page current", requestsPage.pagination.current, 1);
  TestValidator.equals("page limit", requestsPage.pagination.limit, 10);
  TestValidator.predicate(
    "page has records",
    requestsPage.pagination.records > 0,
  );
  TestValidator.predicate("page has pages", requestsPage.pagination.pages > 0);
  // Validate data structure (only verify that it's an array of objects - schema specifies empty ISummary)
  TestValidator.predicate(
    "has at least one request",
    requestsPage.data.length > 0,
  );
  TestValidator.predicate(
    "each request is an object",
    requestsPage.data.every(
      (item) => typeof item === "object" && item !== null,
    ),
  );
}
