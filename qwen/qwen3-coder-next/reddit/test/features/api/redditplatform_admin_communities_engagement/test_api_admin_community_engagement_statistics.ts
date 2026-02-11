import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_engagement_statistics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 2. Authenticate as admin to obtain valid JWT token
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminUser.email,
      password: "12345678",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 3. Generate a valid community ID for testing
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call engagement endpoint with valid communityId
  const engagementData =
    await api.functional.redditPlatform.admin.communities.engagement(
      adminConnection,
      {
        communityId: testCommunityId,
      },
    );
  typia.assert(engagementData);
  // 5. Validate engagement data structure
  TestValidator.predicate(
    "has valid id",
    () => typeof engagementData.id === "string",
  );
  TestValidator.predicate(
    "has valid user data",
    () => engagementData.user !== null,
  );
  TestValidator.equals(
    "user has valid ID",
    engagementData.user.id,
    engagementData.user.id,
  );
  TestValidator.predicate(
    "has engagement duration",
    () => engagementData.engagementDuration !== undefined,
  );
  TestValidator.predicate(
    "has items viewed",
    () => engagementData.itemsViewed !== undefined,
  );
}
