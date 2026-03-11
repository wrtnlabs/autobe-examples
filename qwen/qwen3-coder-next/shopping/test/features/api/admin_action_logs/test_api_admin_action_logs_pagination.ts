import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminActionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_action_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Test pagination with limit=50, page=2
  const paginationResult =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {
          limit: 50,
          page: 2,
        } satisfies IEcommerceMallAdminActionLog.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 2",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals("limit is 50", paginationResult.pagination.limit, 50);
  TestValidator.predicate(
    "pages is non-negative",
    paginationResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "records count matches pagination",
    paginationResult.pagination.records,
    paginationResult.data.length +
      (paginationResult.pagination.pages > 1 ? 50 : 0),
  );
  // Test edge case: page beyond available pages
  const emptyResult =
    await api.functional.ecommerceMall.admin.admin_action_logs.index(
      adminConnection,
      {
        body: {
          limit: 50,
          page: 999999,
        } satisfies IEcommerceMallAdminActionLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty result for out-of-range page
  TestValidator.equals("empty result data", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result current page",
    emptyResult.pagination.current,
    999999,
  );
  TestValidator.equals("empty result limit", emptyResult.pagination.limit, 50);
}
