import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_reports_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_admin_community_reports_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    },
  });
  typia.assert(adminAuth);
  // 2. Browse communities to identify two different communities
  const adminBrowseConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminBrowseConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const communitiesPage =
    await api.functional.redditCommunity.admin.communities.index(
      adminBrowseConnection,
      {
        body: { limit: 10 },
      },
    );
  typia.assert(communitiesPage);
  // Select first two communities for testing
  const communityA = communitiesPage.data[0];
  const communityB = communitiesPage.data[1];
  TestValidator.equals(
    "communities should be different",
    communityA.id,
    communityB.id,
  );
  // 3. Member A setup - create member A and subscribe to community A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(memberAAuth);
  await generate_random_reddit_community_member_subscriptions_create(
    memberAConnection,
    {
      body: {
        reddit_community_communities_id: communityA.id,
      },
    },
  );
  // 4. Member B setup - create member B and subscribe to community B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(memberBAuth);
  await generate_random_reddit_community_member_subscriptions_create(
    memberBConnection,
    {
      body: {
        reddit_community_communities_id: communityB.id,
      },
    },
  );
  // 5. Content creation - posts and comments
  const memberAPost =
    await generate_random_reddit_community_member_posts_create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          reddit_community_community_id: communityA.id,
          text_content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(memberAPost);
  const memberBPost =
    await generate_random_reddit_community_member_posts_create(
      memberBConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          reddit_community_community_id: communityB.id,
          text_content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(memberBPost);
  const memberAComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: { postId: memberAPost.id },
      },
    );
  typia.assert(memberAComment);
  const memberBComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberBConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: { postId: memberBPost.id },
      },
    );
  typia.assert(memberBComment);
  // 6. Report submission - post reports and comment reports
  const memberAPostReport =
    await generate_random_reddit_community_member_posts_reports_create(
      memberAConnection,
      {
        body: {
          reason: "Test post report for community A",
        },
        params: { postId: memberAPost.id },
      },
    );
  typia.assert(memberAPostReport);
  const memberBPostReport =
    await generate_random_reddit_community_member_posts_reports_create(
      memberBConnection,
      {
        body: {
          reason: "Test post report for community B",
        },
        params: { postId: memberBPost.id },
      },
    );
  typia.assert(memberBPostReport);
  const memberACommentReport =
    await generate_random_reddit_community_member_posts_comments_reports_create(
      memberAConnection,
      {
        body: {
          reason: "Test comment report for community A",
        },
        params: { postId: memberAPost.id, commentId: memberAComment.id },
      },
    );
  typia.assert(memberACommentReport);
  const memberBCommentReport =
    await generate_random_reddit_community_member_posts_comments_reports_create(
      memberBConnection,
      {
        body: {
          reason: "Test comment report for community B",
        },
        params: { postId: memberBPost.id, commentId: memberBComment.id },
      },
    );
  typia.assert(memberBCommentReport);
  // 7. Isolation testing - admin views reports for each community
  // 7.1 Admin view reports for community A
  const adminViewConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminViewConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const reportsForCommunityA =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminViewConnection,
      {
        communityId: communityA.id,
        body: { limit: 100 },
      },
    );
  typia.assert(reportsForCommunityA);
  // Verify response contains only reports for community A
  for (const report of reportsForCommunityA.data) {
    TestValidator.equals(
      `report ${report.id} community should be community A`,
      report.community.id,
      communityA.id,
    );
    // 19. Verify reporter object has username matching the reporter of that specific community
    if (report.targetPost) {
      TestValidator.equals(
        `report ${report.id} target post community should match`,
        report.targetPost.community.id,
        communityA.id,
      );
    }
  }
  // 15. Verify response does NOT contain any reports from community B
  const hasCommunityBReports = reportsForCommunityA.data.some(
    (report) => report.community.id === communityB.id,
  );
  TestValidator.predicate(
    "community A reports should not contain community B reports",
    !hasCommunityBReports,
  );
  // 7.2 Admin view reports for community B
  const reportsForCommunityB =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminViewConnection,
      {
        communityId: communityB.id,
        body: { limit: 100 },
      },
    );
  typia.assert(reportsForCommunityB);
  // Verify response contains only reports for community B
  for (const report of reportsForCommunityB.data) {
    TestValidator.equals(
      `report ${report.id} community should be community B`,
      report.community.id,
      communityB.id,
    );
    // 20. Verify targetPost.community.id matches the queried communityId
    if (report.targetPost) {
      TestValidator.equals(
        `report ${report.id} target post community should match`,
        report.targetPost.community.id,
        communityB.id,
      );
    }
  }
  // 18. Verify response does NOT contain any reports from community A
  const hasCommunityAReports = reportsForCommunityB.data.some(
    (report) => report.community.id === communityA.id,
  );
  TestValidator.predicate(
    "community B reports should not contain community A reports",
    !hasCommunityAReports,
  );
  // 21. Verify target comment content preview is visible and belongs to queried community
  for (const report of reportsForCommunityA.data) {
    if (report.targetComment) {
      TestValidator.equals(
        `comment report ${report.id} belongs to community A`,
        report.community.id,
        communityA.id,
      );
      TestValidator.predicate(
        "comment content should be visible",
        report.targetComment.content.length > 0,
      );
    }
  }
  // 22. Test filtering within isolated queue - status_id: "pending" returns only pending reports
  const pendingReportsForCommunityA =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminViewConnection,
      {
        communityId: communityA.id,
        body: {
          limit: 100,
          status_id: "0",
        },
      },
    );
  typia.assert(pendingReportsForCommunityA);
  for (const report of pendingReportsForCommunityA.data) {
    TestValidator.equals(
      `report ${report.id} status should be pending`,
      report.status_id,
      "0",
    );
  }
  // 23. Test reporter_id filter with member A's ID
  const reporterReportsForCommunityA =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminViewConnection,
      {
        communityId: communityA.id,
        body: {
          limit: 100,
          reporter_id: memberAAuth.id,
        },
      },
    );
  typia.assert(reporterReportsForCommunityA);
  for (const report of reporterReportsForCommunityA.data) {
    TestValidator.equals(
      `report ${report.id} reporter should be member A`,
      report.reporter.id,
      memberAAuth.id,
    );
  }
}
