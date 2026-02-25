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

export async function test_api_admin_account_update_complete_profile(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate update data
  const updateData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: `https://example.com/${RandomGenerator.alphabets(10)}.jpg`,
  } satisfies ICommunityPlatformUser.IUpdate;
  // Update admin profile
  const updatedProfile =
    await api.functional.communityPlatform.admin.account.update(
      adminConnection,
      { body: updateData },
    );
  typia.assert(updatedProfile);
  // Validate all fields are updated correctly
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    updateData.display_name,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, updateData.bio);
  TestValidator.equals(
    "avatar URL updated",
    updatedProfile.avatar_url,
    updateData.avatar_url,
  );
  TestValidator.predicate(
    "updated timestamp newer than created",
    new Date(updatedProfile.updated_at) > new Date(updatedProfile.created_at),
  );
  TestValidator.predicate(
    "profile is active",
    updatedProfile.deleted_at === null,
  );
}
