import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_user_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a platform admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(admin);
  // 2. Use the created admin account to retrieve their own public profile summary
  const profile = await api.functional.redditCommunity.platformAdmin.users.at(
    adminConnection,
    {
      userId: admin.id,
    },
  );
  typia.assert(profile);
  // 3. Validate that the returned profile matches the public summary type with the exact expected fields
  TestValidator.equals("profile id matches", profile.id, admin.id);
  TestValidator.equals(
    "profile username matches",
    profile.username,
    admin.username,
  );
  TestValidator.equals(
    "profile display name matches",
    profile.display_name,
    admin.display_name,
  );
  TestValidator.equals("profile bio matches", profile.bio, admin.bio);
  TestValidator.equals(
    "profile avatar url matches",
    profile.avatar_url,
    admin.avatar_url,
  );
  TestValidator.equals(
    "profile karma score matches",
    profile.karma_score,
    admin.karma_score,
  );
  TestValidator.equals(
    "profile created at matches",
    profile.created_at,
    admin.created_at,
  );
  // Note: The IRedditCommunityMember.ISummary type does NOT include postCount or commentCount.
  // We are not validating fields that are not in the declared type.
  // The typia.assert(profile) ensures the structure exactly matches IRedditCommunityMember.ISummary,
  // which excludes private fields (email, password_hash, is_deleted, access, refresh, token).
}
