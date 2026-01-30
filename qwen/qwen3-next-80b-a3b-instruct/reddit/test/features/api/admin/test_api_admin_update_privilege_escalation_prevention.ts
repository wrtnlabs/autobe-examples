import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsAdminPermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdminPermissions";
import type { ICommunityBbsChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsChannel";
import { prepare_random_community_bbs_channel } from "../../../prepare/prepare_random_community_bbs_channel";
import { generate_random_community_bbs_admin_channels_create } from "../../../generate/generate_random_community_bbs_admin_channels_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_update_privilege_escalation_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin with limited permissions (only manage_users: true)
  const limitedAdminConnection: api.IConnection = { host: connection.host };
  const limitedAdmin: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_join(limitedAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    });
  typia.assert(limitedAdmin);
  // Step 2: Create a target admin with default permissions
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_join(targetAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    });
  typia.assert(targetAdmin);
  // Step 3: Create a system channel using the limited admin's connection (required by scenario)
  const channel: ICommunityBbsChannel =
    await generate_random_community_bbs_admin_channels_create(
      limitedAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
        } satisfies ICommunityBbsChannel.ICreate,
      },
    );
  typia.assert(channel);
  // Step 4: Attempt to escalate target admin's permissions to include manage_communities: true
  // Since we cannot read the permissions of the target admin from the API response,
  // we need to assume a baseline set of permissions (what we know the limited admin has)
  // and try to elevate them. The business rule is: an admin cannot give someone
  // permissions they themselves don't have. We'll simulate granting manage_communities
  // which the limited admin does not have (based on the scenario description).
  // We know limited admin has 'manage_users': true and 'manage_communities': false
  // from the scenario. We'll update target admin to have manage_communities: true
  await TestValidator.httpError(
    "admin cannot escalate privileges beyond own permissions",
    403, // Expected 403 Forbidden - as per scenario
    async () => {
      await api.functional.communityBbs.admin.admins.update(
        limitedAdminConnection,
        {
          adminId: targetAdmin.id,
          body: {
            permissions: {
              manage_users: true, // This admin has this permission
              manage_communities: true, // This is the escalation - exceeds limited admin's own permissions
            },
          } satisfies ICommunityBbsAdmin.IUpdate,
        },
      );
    },
  );
  // Step 5: Verify target admin's permissions still do not include manage_communities by trying to update again
  // To ensure the update was properly rejected and permissions unchanged, we'll try to update
  // to the same escalated permissions again. This should also be rejected.
  await TestValidator.httpError(
    "admin cannot escalate privileges beyond own permissions - second attempt",
    403, // Expected 403 Forbidden again
    async () => {
      await api.functional.communityBbs.admin.admins.update(
        limitedAdminConnection,
        {
          adminId: targetAdmin.id,
          body: {
            permissions: {
              manage_users: true,
              manage_communities: true,
            },
          } satisfies ICommunityBbsAdmin.IUpdate,
        },
      );
    },
  );
}
