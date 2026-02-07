import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_audit_logs_filtered_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as system administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Call system config audit logs endpoint with empty request body
  // ICommunitySystemConfig.IRequest is empty, so we pass an empty object
  const auditResponse =
    await api.functional.community.admin.audit.system_configs.index(
      adminConnection,
      {
        body: {} satisfies ICommunitySystemConfig.IRequest,
      },
    );
  typia.assert(auditResponse);
  // 3. Validate pagination metadata exists and is correct
  TestValidator.equals(
    "response has pagination",
    auditResponse.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "response has limit",
    auditResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "response has records",
    auditResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "response has pages",
    auditResponse.pagination.pages >= 0,
    true,
  );
  // 4. Verify pagination data exists but cannot validate content since ISummary has no properties
  // ICommunitySystemConfig.ISummary is empty, so no verification of config data is possible
  // We only confirm structure and that API does not throw
}
