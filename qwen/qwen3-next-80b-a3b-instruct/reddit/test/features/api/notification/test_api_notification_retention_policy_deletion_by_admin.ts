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
export async function test_api_notification_retention_policy_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a valid UUID for policyId
  const policyId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Delete the notification retention policy
  await api.functional.communityPlatform.admin.notification_retention_policies.erase(
    adminConnection,
    {
      policyId,
    },
  );
  // Step 3: Verify that unauthorized access fails
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user should not be able to delete policy",
    async () => {
      await api.functional.communityPlatform.admin.notification_retention_policies.erase(
        guestConnection,
        { policyId },
      );
    },
  );
  // Step 4: Verify that the deletion endpoint works with admin permissions
  // We can't verify policy is gone because there's no 'at' endpoint to check,
  // but we can test that the delete operation is available and authorized correctly for admins
  const secondPolicyId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.communityPlatform.admin.notification_retention_policies.erase(
    adminConnection,
    {
      policyId: secondPolicyId,
    },
  );
}
