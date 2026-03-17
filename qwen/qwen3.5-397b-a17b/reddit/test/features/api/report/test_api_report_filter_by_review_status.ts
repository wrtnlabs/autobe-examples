import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportAction";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_communities_reports_actions_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_actions_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";
import { prepare_random_reddit_clone_report_action } from "../../../prepare/prepare_random_reddit_clone_report_action";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_report_filter_by_review_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member who will be the moderator
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe member to the community (already done by community creation, but ensure)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Member is already owner/moderator from community creation, but verify moderator status
  // The community creator is automatically assigned as owner-level moderator
  // 5. Create multiple posts in the community to be reported
  const posts = await ArrayUtil.asyncRepeat(3, async (index) => {
    const post = await generate_random_reddit_clone_member_posts_create(
      moderatorConnection,
      {
        body: {
          title: `Test Post ${index + 1}`,
          post_type: "TEXT",
          community_id: community.id,
          text: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IRedditClonePostText.ICreate,
        } satisfies IRedditClonePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // 6. Submit multiple reports on those posts (all start as PENDING)
  const reports = await ArrayUtil.asyncRepeat(6, async (index) => {
    const targetPost = posts[index % posts.length];
    const report =
      await generate_random_reddit_clone_member_communities_reports_create(
        moderatorConnection,
        {
          body: {
            target_type: "POST",
            target_id: targetPost.id,
            reason: `Report reason ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          } satisfies IRedditCloneReport.ICreate,
          params: {
            communityId: community.id,
          },
        },
      );
    typia.assert(report);
    return report;
  });
  // Verify all reports start as PENDING
  for (const report of reports) {
    TestValidator.equals(
      "initial report status is PENDING",
      report.review_status,
      "PENDING",
    );
  }
  // 7. Take moderator action to APPROVE first 2 reports (changes status to APPROVED)
  const approvedReports = reports.slice(0, 2);
  for (const report of approvedReports) {
    const action =
      await generate_random_reddit_clone_member_communities_reports_actions_create(
        moderatorConnection,
        {
          body: {
            action: "APPROVE",
          } satisfies IRedditCloneReportAction.ICreate,
          params: {
            communityId: community.id,
            reportId: report.id,
          },
        },
      );
    typia.assert(action);
    TestValidator.equals("action is APPROVE", action.action, "APPROVE");
  }
  // 8. Take moderator action to DISMISS next 2 reports (changes status to DISMISSED)
  const dismissedReports = reports.slice(2, 4);
  for (const report of dismissedReports) {
    const action =
      await generate_random_reddit_clone_member_communities_reports_actions_create(
        moderatorConnection,
        {
          body: {
            action: "DISMISS",
          } satisfies IRedditCloneReportAction.ICreate,
          params: {
            communityId: community.id,
            reportId: report.id,
          },
        },
      );
    typia.assert(action);
    TestValidator.equals("action is DISMISS", action.action, "DISMISS");
  }
  // 9. Leave last 2 reports in PENDING status (no action taken)
  const pendingReports = reports.slice(4, 6);
  // 10. Verify filtering by PENDING returns only reports awaiting moderator action
  const pendingResult =
    await api.functional.redditClone.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          review_status: "PENDING",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "PENDING filter count matches expected",
    pendingResult.data.length,
    pendingReports.length,
  );
  TestValidator.equals(
    "PENDING pagination records count",
    pendingResult.pagination.records,
    pendingReports.length,
  );
  const pendingIds = pendingResult.data.map((r) => r.id);
  for (const report of pendingReports) {
    TestValidator.predicate(
      `pending report ${report.id} in results`,
      pendingIds.includes(report.id),
    );
  }
  for (const report of [...approvedReports, ...dismissedReports]) {
    TestValidator.predicate(
      `non-pending report ${report.id} not in results`,
      !pendingIds.includes(report.id),
    );
  }
  // 11. Verify filtering by APPROVED returns only reports where content was removed
  const approvedResult =
    await api.functional.redditClone.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          review_status: "APPROVED",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "APPROVED filter count matches expected",
    approvedResult.data.length,
    approvedReports.length,
  );
  TestValidator.equals(
    "APPROVED pagination records count",
    approvedResult.pagination.records,
    approvedReports.length,
  );
  const approvedIds = approvedResult.data.map((r) => r.id);
  for (const report of approvedReports) {
    TestValidator.predicate(
      `approved report ${report.id} in results`,
      approvedIds.includes(report.id),
    );
  }
  for (const report of [...pendingReports, ...dismissedReports]) {
    TestValidator.predicate(
      `non-approved report ${report.id} not in results`,
      !approvedIds.includes(report.id),
    );
  }
  // 12. Verify filtering by DISMISSED returns only reports with no action taken
  const dismissedResult =
    await api.functional.redditClone.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          review_status: "DISMISSED",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(dismissedResult);
  TestValidator.equals(
    "DISMISSED filter count matches expected",
    dismissedResult.data.length,
    dismissedReports.length,
  );
  TestValidator.equals(
    "DISMISSED pagination records count",
    dismissedResult.pagination.records,
    dismissedReports.length,
  );
  const dismissedIds = dismissedResult.data.map((r) => r.id);
  for (const report of dismissedReports) {
    TestValidator.predicate(
      `dismissed report ${report.id} in results`,
      dismissedIds.includes(report.id),
    );
  }
  for (const report of [...pendingReports, ...approvedReports]) {
    TestValidator.predicate(
      `non-dismissed report ${report.id} not in results`,
      !dismissedIds.includes(report.id),
    );
  }
  // 13. Verify all review statuses are correctly set on the reports
  for (const report of pendingReports) {
    TestValidator.equals(
      `report ${report.id} status is PENDING`,
      report.review_status,
      "PENDING",
    );
  }
  for (const report of approvedReports) {
    TestValidator.equals(
      `report ${report.id} status is APPROVED`,
      report.review_status,
      "APPROVED",
    );
  }
  for (const report of dismissedReports) {
    TestValidator.equals(
      `report ${report.id} status is DISMISSED`,
      report.review_status,
      "DISMISSED",
    );
  }
}
