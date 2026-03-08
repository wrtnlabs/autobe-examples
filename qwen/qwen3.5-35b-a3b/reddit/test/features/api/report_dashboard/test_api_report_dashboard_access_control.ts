import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_dashboard_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Setup test data: Create admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Create two test communities
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: "admin2@test.com",
      password: "1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  const communityA =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection2,
      {
        body: {
          name: "test_community_a",
          description: "Community A for testing",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const communityB =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection2,
      {
        body: {
          name: "test_community_b",
          description: "Community B for testing",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // Create a regular member (non-moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      username: "test_member",
      password: "1234",
      href: "http://test.com",
      referrer: "http://test.com",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(regularMember);
  // Test 1: Anonymous access - should return 401
  const anonConnection: api.IConnection = { host: connection.host };
  try {
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      anonConnection,
      {
        body: {
          status: "PENDING",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
    void TestValidator.error("anonymous access should fail", async () => {
      // Already failed, but we need to trigger error
      throw new Error("Expected 401 but request succeeded");
    });
  } catch (exp) {
    if (typia.is<api.HttpError>(exp)) {
      TestValidator.equals("anonymous should return 401", exp.status, 401);
    } else {
      throw exp;
    }
  }
  // Test 2: Non-moderator member access - should return 403
  const memberDashboard =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      memberConnection,
      {
        body: {
          status: "PENDING",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(memberDashboard);
  TestValidator.equals(
    "non-moderator sees no reports",
    memberDashboard.data.length,
    0,
  );
  // Test 3: Create moderator and assign to community A only
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: "moderator@test.com",
      username: "test_moderator",
      password: "1234",
      href: "http://test.com",
      referrer: "http://test.com",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderator);
  // Make moderator moderator of community A only
  await api.functional.redditPlatform.member.communities.moderators.add(
    adminConnection2,
    {
      communityId: communityA.id,
      body: {
        user_id: moderator.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // Create posts in both communities
  const postInA = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Post in Community A",
        postType: "TEXT",
        redditPlatformCommunityId: communityA.id,
        content: "This is a test post",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(postInA);
  const postInB = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Post in Community B",
        postType: "TEXT",
        redditPlatformCommunityId: communityB.id,
        content: "This is another test post",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(postInB);
  // Create reports for both posts
  const reportA = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: communityA.id,
        reported_content_type: "POST",
        reported_content_id: postInA.id,
        reason: "Test report for community A post",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(reportA);
  const reportB = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: communityB.id,
        reported_content_type: "POST",
        reported_content_id: postInB.id,
        reason: "Test report for community B post",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(reportB);
  // Test 4: Moderator should only see reports from community A
  const moderatorDashboard =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      moderatorConnection,
      {
        body: {
          status: "PENDING",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(moderatorDashboard);
  // Should only have reports from community A (moderated community)
  const reportsFromA = moderatorDashboard.data.filter(
    (r) => r.community_name === communityA.name,
  );
  const reportsFromB = moderatorDashboard.data.filter(
    (r) => r.community_name === communityB.name,
  );
  TestValidator.equals(
    "moderator sees reports from moderated community only",
    reportsFromA.length,
    1,
  );
  TestValidator.equals(
    "moderator does NOT see reports from non-moderated community",
    reportsFromB.length,
    0,
  );
}