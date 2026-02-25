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

export async function test_api_admin_account_update_empty_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  typia.assert(adminAuth);
  // Update admin profile with null/empty values
  const updateBody = {
    display_name: null,
    bio: null,
    avatar_url: null,
  } satisfies ICommunityPlatformUser.IUpdate;
  const updatedProfile =
    await api.functional.communityPlatform.admin.account.update(
      adminConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // Validate that null values are properly handled
  TestValidator.equals(
    "display_name should be null",
    updatedProfile.display_name,
    null,
  );
  TestValidator.equals("bio should be null", updatedProfile.bio, null);
  TestValidator.equals(
    "avatar_url should be null",
    updatedProfile.avatar_url,
    null,
  );
  // Validate that other fields are preserved and have valid values
  TestValidator.equals(
    "id should remain unchanged",
    updatedProfile.id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "username should be non-empty string",
    typeof updatedProfile.username === "string" &&
      updatedProfile.username.length > 0,
  );
  TestValidator.predicate(
    "karma should be integer",
    Number.isInteger(updatedProfile.karma),
  );
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(new Date(updatedProfile.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(new Date(updatedProfile.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at should be null",
    updatedProfile.deleted_at,
    null,
  );
}
