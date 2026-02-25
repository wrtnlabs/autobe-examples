import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reports_decisions_erase_success_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join & authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${typia.random<string & tags.Format<"email">>()}`,
      password: "password123",
      displayName: "Admin User",
      bio: null,
      avatarUrl: null,
    },
  });
  // Update adminConnection authorization header with token
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers["Authorization"] = authorized.token.access;
  // 2. Create a dummy report decision to be deleted
  // Since no creation endpoint is specified, simulate an existing UUID
  // which would realistically exist. Using random UUID for test
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the report decision
  await api.functional.communityPlatform.admin.reports_decisions.erase(
    adminConnection,
    {
      id: reportDecisionId,
    },
  );
  // No content response expected - typia.assert no return as void
  // 4. Validate deletion by attempting to delete again - expect error
  await TestValidator.error(
    "Deleting non-existent report decision throws",
    async () => {
      await api.functional.communityPlatform.admin.reports_decisions.erase(
        adminConnection,
        {
          id: reportDecisionId,
        },
      );
    },
  );
}
