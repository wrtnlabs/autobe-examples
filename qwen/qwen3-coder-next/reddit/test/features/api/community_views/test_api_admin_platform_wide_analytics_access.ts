import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_platform_wide_analytics_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      username: "admin_user",
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Test platform-wide analytics access
  const platformAnalytics =
    await api.functional.redditPlatform.community_views.index(adminConnection, {
      body: {},
    });
  typia.assert(platformAnalytics);
  // Test filtered analytics access with community_id
  const filteredAnalytics =
    await api.functional.redditPlatform.community_views.index(adminConnection, {
      body: {
        community_id: platformAnalytics.community_id,
      },
    });
  typia.assert(filteredAnalytics);
  // Verify filtered analytics returns data for specific community
  TestValidator.equals(
    "filtered analytics matches community_id",
    filteredAnalytics.community_id,
    platformAnalytics.community_id,
  );
}
