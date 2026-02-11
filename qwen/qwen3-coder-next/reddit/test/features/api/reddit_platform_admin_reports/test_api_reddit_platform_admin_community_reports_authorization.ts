import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_reddit_platform_admin_community_reports_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for setup operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // Create member connection for testing unauthorized access
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // Create community owned by the member (to test ownership doesn't grant admin access)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Test 1: Member trying to access admin reports (should be 403 Forbidden)
  await TestValidator.error("member cannot access admin reports", async () => {
    await api.functional.redditPlatform.admin.communities.reports.index(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  });
  // Test 2: Unauthenticated access (should also be 403 Forbidden)
  await TestValidator.error(
    "unauthenticated access to admin reports",
    async () => {
      await api.functional.redditPlatform.admin.communities.reports.index(
        { host: connection.host },
        {
          communityId: community.id,
        },
      );
    },
  );
  // Test 3: Verify admin can access the reports (positive control)
  const reports =
    await api.functional.redditPlatform.admin.communities.reports.index(
      adminConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(reports);
}
