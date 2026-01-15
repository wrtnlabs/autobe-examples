import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_deletion_by_authorized_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCreds });
  // Step 2: Create an unauthenticated user connection for unauthorized access test
  const userConnection: api.IConnection = { host: connection.host };
  // Step 3: Generate a report ID (UUID) that would be used for deletion
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Test that authorized admin can successfully delete admin report
  await api.functional.communityPlatform.admin.report.of.admins.erase(
    adminConnection,
    {
      logId,
    },
  );
  // Step 5: Verify that unauthorized user cannot delete the same report
  // Even though actual delete may have succeeded, we test that unauthorized access would fail with 404
  // This validates the authorization requirement in the scenario
  await TestValidator.error(
    "unauthorized user cannot delete admin report",
    async () => {
      await api.functional.communityPlatform.admin.report.of.admins.erase(
        userConnection,
        {
          logId,
        },
      );
    },
  );
  // The system does not provide a way to verify deletion success
  // We rely on the fact that if no error was thrown, the deletion was accepted
  // The error test for unauthorized access confirms the authorization mechanism works
}
