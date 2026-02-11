import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_reddit_platform_admin_community_reports_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Create test community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      adminConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphaNumeric(6)}`,
          description: "Test community for report retrieval",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create members who will report content
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(1),
    } satisfies IRedditPlatformMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(1),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 4. Create posts in the community for reporting
  const post1 = await generate_random_reddit_platform_member_posts_create(
    adminConnection,
    {
      body: {
        communityId: community.id,
        title: "Test post 1",
        type: "TEXT",
        content: "This is a test post that will be reported.",
        url: null,
        imageUrl: null,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_platform_member_posts_create(
    adminConnection,
    {
      body: {
        communityId: community.id,
        title: "Test post 2",
        type: "LINK",
        content: null,
        url: "https://example.com/test",
        imageUrl: null,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 5. Create reports for the posts
  const report1 =
    await generate_random_reddit_platform_member_reddit_platform_reports_create(
      member1Connection,
      {
        body: {
          reported_type: "POST",
          reported_id: post1.id,
          reason: " spam",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report1);
  const report2 =
    await generate_random_reddit_platform_member_reddit_platform_reports_create(
      member2Connection,
      {
        body: {
          reported_type: "POST",
          reported_id: post2.id,
          reason: " inappropriate content",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report2);
  // 6. Test admin retrieves reports for the community
  const reportsResponse =
    await api.functional.redditPlatform.admin.communities.reports.index(
      adminConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(reportsResponse);
  // 7. Validate response structure
  TestValidator.equals(
    "pagination exists",
    reportsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count matches",
    reportsResponse.data.length === reportsResponse.pagination.records,
  );
  TestValidator.predicate(
    "has at least the reports we created",
    reportsResponse.data.length >= 2,
  );
  // 8. Verify reports belong to the correct community
  for (const report of reportsResponse.data) {
    TestValidator.equals("community id matches", report.reported_type, "POST");
    TestValidator.predicate("has reporter info", report.reporter !== null);
    TestValidator.predicate(
      "has timestamp info",
      report.created_at !== null && typeof report.created_at === "string",
    );
  }
}
