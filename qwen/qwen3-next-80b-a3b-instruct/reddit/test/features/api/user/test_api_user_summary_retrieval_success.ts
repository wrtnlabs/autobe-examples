import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuestSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSummary";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_user_summary_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(admin);
  // Use the platform admin's own ID to retrieve their summary
  // The endpoint is designed to work with any user ID, and platform admins are valid users
  const summary =
    await api.functional.redditCommunity.platformAdmin.users.summary.at(
      adminConnection,
      { userId: admin.id },
    );
  typia.assert(summary);
  // Validate summary properties match the admin account data from the join response
  TestValidator.equals(
    "display_name matches",
    summary.display_name,
    admin.display_name,
  );
  TestValidator.equals("bio matches", summary.bio, admin.bio);
  TestValidator.equals(
    "avatar_url matches",
    summary.avatar_url,
    admin.avatar_url,
  );
  TestValidator.equals(
    "karma_score matches",
    summary.karma_score,
    admin.karma_score,
  );
  TestValidator.predicate(
    "total_post_count is non-negative",
    summary.total_post_count >= 0,
  );
  TestValidator.predicate(
    "total_comment_count is non-negative",
    summary.total_comment_count >= 0,
  );
}
