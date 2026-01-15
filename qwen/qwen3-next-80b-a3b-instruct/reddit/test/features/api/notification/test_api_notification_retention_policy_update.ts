import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationRetentionPolicy";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_retention_policy_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin using authorize_admin_join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 2: Generate a valid policy ID that would exist in the system (simulating a known existing policy)
  const policyId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the notification retention policy with a valid retention period
  const updatedRetentionPeriod = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<730>
  >();
  const updatedPolicy: ICommunityPlatformNotificationRetentionPolicy =
    await api.functional.communityPlatform.notification_retention_policies.update(
      adminConnection,
      {
        policyId: policyId,
        body: {
          retention_period: updatedRetentionPeriod,
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IUpdate,
      },
    );
  typia.assert(updatedPolicy);
  // Step 4: Validate the updated policy has the new retention period and preserved other attributes
  TestValidator.equals(
    "retention period updated correctly",
    updatedPolicy.retention_period,
    updatedRetentionPeriod,
  );
  // Verify other policy attributes are preserved (assuming they were unchanged)
  // Since we cannot retrieve the original policy, we validate that the response contains valid values
  TestValidator.predicate(
    "notification_type is a string",
    () => typeof updatedPolicy.notification_type === "string",
  );
  TestValidator.predicate("scope is a valid value", () =>
    ["global", "channel_specific", "user_specific"].includes(
      updatedPolicy.scope,
    ),
  );
  TestValidator.predicate(
    "is_active is a boolean",
    () => typeof updatedPolicy.is_active === "boolean",
  );
}
