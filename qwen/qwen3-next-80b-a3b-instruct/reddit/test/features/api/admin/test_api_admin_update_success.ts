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
export async function test_api_admin_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an authenticated admin account with initial status 'active' and default permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const createdAdmin: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
      } satisfies ICommunityBbsAdmin.IJoin,
    });
  typia.assert(createdAdmin);
  // Step 2: Create a system channel as prerequisite
  const channelConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(channelConnection, {
    body: {
      email: createdAdmin.email,
      password,
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  const channel: ICommunityBbsChannel =
    await generate_random_community_bbs_admin_channels_create(
      channelConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
        } satisfies ICommunityBbsChannel.ICreate,
      },
    );
  typia.assert(channel);
  // Step 3: Update admin's status to 'suspended' and revoke manage_users permission
  const updateConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(updateConnection, {
    body: {
      email: createdAdmin.email,
      password,
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  // Create the permissions object for update to revoke manage_users access
  // Per the scenario, we're revoking manage_users permission
  const adminPermissions: ICommunityBbsAdminPermissions = {
    manage_users: false,
  };
  // Update the admin - this will change the status and permissions
  const updateResponse: ICommunityBbsAdmin =
    await api.functional.communityBbs.admin.admins.update(updateConnection, {
      adminId: createdAdmin.id,
      body: {
        status: "suspended",
        permissions: adminPermissions,
      } satisfies ICommunityBbsAdmin.IUpdate,
    });
  typia.assert(updateResponse);
  // Step 4: Validate the update response directly from the update operation
  // Since we can't retrieve the admin by ID, we validate what was returned
  // from the update operation itself, as per the API specification
  TestValidator.equals(
    "admin status updated to suspended",
    updateResponse.status,
    "suspended",
  );
  // Validate other properties that are provided in ICommunityBbsAdmin
  TestValidator.predicate(
    "admin ID preserved",
    () => updateResponse.id === createdAdmin.id,
  );
  TestValidator.equals(
    "admin email preserved",
    updateResponse.email,
    createdAdmin.email,
  );
  // Note: We cannot validate permissions because the API doesn't expose it in the response
  // The update operation itself validates the request, and we're only required to test
  // that the update is successful with the specified changes
}
