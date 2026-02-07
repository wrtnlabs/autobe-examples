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

export async function test_api_admin_override_audit_specific_admin_24_hours(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin account to access audit reports
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authResponse);
  // 2. Execute the audit report query for override actions within last 24 hours
  // Since IShoppingMallAdminAction.IRequest is defined as an empty object {} in the schema,
  // we must use exactly {} as the request body to comply with TypeScript type safety
  const auditReport =
    await api.functional.shoppingMall.admin.admin_actions.report.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdminAction.IRequest,
      },
    );
  typia.assert(auditReport);
  // 3. Validate response structure - only what exists in the schema:
  // - pagination structure is defined
  // - data array is defined (though empty)
  TestValidator.equals(
    "pagination has correct current page",
    auditReport.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    auditReport.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    auditReport.pagination.records >= auditReport.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    auditReport.pagination.pages >= 1,
  );
  // 4. Since IShoppingMallAdminAction.ISummary is defined as empty object {},
  // we cannot validate any properties like action_type, affected_entity_type, or created_at
  // as they do not exist in the schema. The only valid validation is that
  // the response structure is correct and the API returns a valid response.
}
