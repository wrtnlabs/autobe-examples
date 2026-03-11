import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_monitoring_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call session monitoring endpoint with empty request body (no filters)
  const response =
    await api.functional.multiUserTodo.admin.admins.sessions.index(
      adminConnection,
      {
        body: {} satisfies IMultiUserTodoAdminSession.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is 1 by default",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate session data structure via typia.assert (complete validation)
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Each session is already validated by typia.assert(response) which validates the entire structure
  // No additional type validation needed after typia.assert
  // 5. Validate pagination consistency (business logic)
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );
  } else {
    TestValidator.equals(
      "pages should be 0 when records is 0",
      response.pagination.pages,
      0,
    );
  }
}
