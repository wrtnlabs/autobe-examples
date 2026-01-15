import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditConfiguration";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_audit_configuration_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin using the authorization utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join", // Mandatory URI format
      referrer: "https://example.com", // Mandatory URI format
      ip: null, // Optional field - explicitly set to null
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 3: Retrieve audit configuration using the admin's authenticated connection
  const auditConfig: ICommunityPlatformAuditConfiguration =
    await api.functional.communityPlatform.admin.reports.configurations.audit.at(
      adminConnection,
    );
  // Step 4: Validate the response structure and type safety - typia.assert() covers everything
  typia.assert(auditConfig);
}
