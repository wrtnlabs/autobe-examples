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

export async function test_api_admin_audit_trail_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create an admin account to establish valid session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Execute: Fetch the audit trail with default pagination (no filters)
  const auditResponse =
    await api.functional.shoppingMall.admin.admin_actions.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdminAction.IRequest,
      },
    );
  typia.assert(auditResponse);
  // Validate: Response structure and data properties
  // Pagination validation
  TestValidator.equals(
    "pagination current page is 1",
    auditResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 25 (default)",
    auditResponse.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "pagination records >= 25",
    auditResponse.pagination.records >= 25,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    auditResponse.pagination.pages >= 1,
  );
  // Data validation
  // Since IShoppingMallAdminAction.ISummary is an empty object ({}), we can only validate array length
  TestValidator.equals(
    "data has exactly 25 entries",
    auditResponse.data.length,
    25,
  );
}
