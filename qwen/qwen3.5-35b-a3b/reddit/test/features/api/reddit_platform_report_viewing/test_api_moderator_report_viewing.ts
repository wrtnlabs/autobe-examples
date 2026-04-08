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

export async function test_api_moderator_report_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member A creates community "test-community"
  const communityName = "test-community";
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: communityName,
          description: "A test community for report viewing",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member B creates a text post in test-community
  const post1 = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  // 5. Member B submits first report against their post with reason "spam content"
  const report1 = await api.functional.redditPlatform.member.reports.create(
    memberBConnection,
    {
      body: {
        target_id: post1.id,
        target_type: "post",
        reason: "spam content",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  // 6. Member A creates a second post in test-community
  const post2 = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 7. Member A submits second report against their own post
  const report2 = await api.functional.redditPlatform.member.reports.create(
    memberAConnection,
    {
      body: {
        target_id: post2.id,
        target_type: "post",
        reason: "inappropriate content",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  // 8. Call the reports index endpoint as Member A (community owner)
  const response =
    await api.functional.redditPlatform.member.communities.reports.index(
      memberAConnection,
      {
        communityName: community.name,
        body: {},
      },
    );
  typia.assert(response);
  // 9. Verify response structure and data
  TestValidator.equals(
    "response has pagination",
    response.pagination.records,
    2,
  );
  TestValidator.equals("response has 2 reports", response.data.length, 2);
  TestValidator.equals("page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.equals("pages is 1", response.pagination.pages, 1);
  // Verify both reports are present
  const reportIds = response.data.map((r) => r.id);
  TestValidator.equals(
    "contains report 1",
    reportIds.includes(report1.id),
    true,
  );
  TestValidator.equals(
    "contains report 2",
    reportIds.includes(report2.id),
    true,
  );
  // Verify report data includes correct fields
  for (const report of response.data) {
    typia.assert(report);
    TestValidator.predicate("report has status", report.status === "pending");
    TestValidator.predicate("report has reason", report.reason.length > 0);
    TestValidator.predicate(
      "report has community",
      report.community.id === community.id,
    );
    TestValidator.predicate(
      "report has reporter",
      report.reported_by !== undefined,
    );
    TestValidator.predicate("report has target", report.target_type === "post");
    TestValidator.predicate(
      "report has timestamp",
      report.created_at !== undefined,
    );
  }
  // Verify reports are sorted by created_at DESC (most recent first)
  if (response.data.length >= 2) {
    const firstReport = response.data[0];
    const secondReport = response.data[1];
    TestValidator.predicate(
      "reports sorted by created_at DESC",
      new Date(firstReport.created_at) >= new Date(secondReport.created_at),
    );
  }
}