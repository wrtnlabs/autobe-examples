import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderator_report_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (community owner) joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphaNumeric(6) + "moderator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Member A creates community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: "filter-test-community",
          description: "Community for testing report filtering",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphaNumeric(6) + "reporter",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 4. Member B creates first post
  const post1 = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        community_id: community.id,
        title: "First test post",
        post_type: "text",
        text_content: "This is the content of the first post",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  // 5. Member B submits first report (pending)
  const report1 = await api.functional.redditPlatform.member.reports.create(
    memberBConnection,
    {
      body: {
        target_id: post1.id,
        target_type: "post",
        reason: "First report for testing",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  typia.assert(report1.status === "pending");
  // 6. Member A approves first report
  const approvedReport1 =
    await api.functional.redditPlatform.member.reports.approve(
      memberAConnection,
      {
        reportId: report1.id,
      },
    );
  typia.assert(approvedReport1);
  typia.assert(approvedReport1.status === "approved");
  // 7. Member B creates second post
  const post2 = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        community_id: community.id,
        title: "Second test post",
        post_type: "text",
        text_content: "This is the content of the second post",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 8. Member B submits second report (pending)
  const report2 = await api.functional.redditPlatform.member.reports.create(
    memberBConnection,
    {
      body: {
        target_id: post2.id,
        target_type: "post",
        reason: "Second report for testing",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  typia.assert(report2.status === "pending");
  // 9. Member A dismisses second report
  const dismissedReport2 =
    await api.functional.redditPlatform.member.reports.dismiss(
      memberAConnection,
      {
        reportId: report2.id,
      },
    );
  typia.assert(dismissedReport2);
  typia.assert(dismissedReport2.status === "dismissed");
  // 10. Test filter: status='pending' - should return 0 (no pending reports left)
  let result =
    await api.functional.redditPlatform.member.communities.reports.index(
      memberAConnection,
      {
        communityName: community.name,
        body: {
          target_type: "post" as const,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals("pending reports count", result.pagination.records, 0);
  // 11. Test filter: status='approved' - should return 1
  result = await api.functional.redditPlatform.member.communities.reports.index(
    memberAConnection,
    {
      communityName: community.name,
      body: {
        target_type: "post" as const,
      } satisfies IRedditPlatformReport.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals("approved reports count", result.pagination.records, 1);
  // 12. Test filter: status='dismissed' - should return 1
  result = await api.functional.redditPlatform.member.communities.reports.index(
    memberAConnection,
    {
      communityName: community.name,
      body: {
        target_type: "post" as const,
      } satisfies IRedditPlatformReport.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals("dismissed reports count", result.pagination.records, 1);
  // 13. Test combined filter: status='approved' AND target_type='post'
  result = await api.functional.redditPlatform.member.communities.reports.index(
    memberAConnection,
    {
      communityName: community.name,
      body: {
        target_type: "post" as const,
      } satisfies IRedditPlatformReport.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "approved post reports count",
    result.pagination.records,
    1,
  );
  // 14. Test no filters - all reports (2 total)
  result = await api.functional.redditPlatform.member.communities.reports.index(
    memberAConnection,
    {
      communityName: community.name,
      body: {} satisfies IRedditPlatformReport.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals("all reports count", result.pagination.records, 2);
  // 15. Test empty result with non-existent status filter
  result = await api.functional.redditPlatform.member.communities.reports.index(
    memberAConnection,
    {
      communityName: community.name,
      body: {
        target_type: "post" as const,
      } satisfies IRedditPlatformReport.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "pending reports with empty result",
    result.data.length,
    0,
  );
  TestValidator.equals(
    "empty result total_count",
    result.pagination.records,
    0,
  );
}
