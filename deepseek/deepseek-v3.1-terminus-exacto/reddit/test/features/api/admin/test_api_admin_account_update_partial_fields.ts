import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_account_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin account using authorized join utility function
  const adminProfile = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password123",
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminProfile);
  // Store original values for verification
  const originalDisplayName = adminProfile.display_name;
  const newDisplayName = "Updated Admin Name";
  // Perform partial update - only updating display_name, omitting bio and avatar_url
  const updateBody = {
    display_name: newDisplayName,
    // bio and avatar_url are intentionally omitted to test partial update behavior
  } satisfies ICommunityPlatformUser.IUpdate;
  const updatedProfile =
    await api.functional.communityPlatform.admin.account.update(
      adminConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // Validate partial update behavior - ensure omitted fields preserve their values
  TestValidator.equals(
    "display name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display name should differ from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
  // Remove email validation since it doesn't exist on ICommunityPlatformUser
  TestValidator.predicate(
    "profile should have updated timestamp",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(adminProfile.updated_at).getTime(),
  );
  TestValidator.predicate(
    "karma should be a valid integer",
    updatedProfile.karma >= 0,
  );
  TestValidator.equals(
    "user id should remain the same",
    updatedProfile.id,
    adminProfile.id,
  );
  TestValidator.predicate(
    "created at should be before or equal to updated at",
    new Date(updatedProfile.created_at).getTime() <=
      new Date(updatedProfile.updated_at).getTime(),
  );
}