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

export async function test_api_platform_admin_user_profile_with_no_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Use the created admin user's ID as the target user
  // (this user has no posts or comments since just created)
  const userId = admin.id;
  // Step 3: Call the platform admin user profile endpoint
  const profile = await api.functional.redditCommunity.platformAdmin.users.at(
    adminConnection,
    {
      userId,
    },
  );
  typia.assert(profile);
  // Step 4: Validate that profile matches IRedditCommunityMember.ISummary
  TestValidator.equals("user id matches", profile.id, userId);
  TestValidator.predicate(
    "karma score is integer",
    typeof profile.karma_score === "number",
  );
  TestValidator.predicate(
    "created at is date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.created_at),
  );
  // Ensure all required fields are present
  TestValidator.equals(
    "display_name is string",
    typeof profile.display_name,
    "string",
  );
  TestValidator.equals(
    "bio is string or null",
    profile.bio === null || typeof profile.bio === "string",
    true,
  );
  TestValidator.equals(
    "avatar_url is string or null",
    profile.avatar_url === null || typeof profile.avatar_url === "string",
    true,
  );
}