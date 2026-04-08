import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_post_reports_sorting_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register 3 member accounts
  const memberConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: `member_${i}_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
        password: "Test1234!",
        username: `user_${i}_${RandomGenerator.name(1)}`,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      },
    });
    memberConnections.push(memberConnection);
  }
  // 2. First member creates a post in a community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnections[0],
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text" as const,
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create 3 reports on the same post from different members
  const reportResponses: IRedditCommunityReport[] = [];
  // First report from second member
  const report1 =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberConnections[1],
      {
        postId: post.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report1);
  reportResponses.push(report1);
  // Small delay to ensure distinct created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second report from third member
  const report2 =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberConnections[2],
      {
        postId: post.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report2);
  reportResponses.push(report2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Third report from first member
  const report3 =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberConnections[0],
      {
        postId: post.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report3);
  reportResponses.push(report3);
  // 4. Fetch all reports without status filter
  const reportPage: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.member.posts.reports.index(
      memberConnections[0],
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(reportPage);
  // 5. Validate that all reports are returned
  TestValidator.equals(
    "report count",
    reportPage.data.length,
    reportResponses.length,
  );
  // 6. Validate sorting: by created_at DESC (newest first) within same status
  // Since status_id is UUID string per DTO ISummary, we only verify chronological order
  const expectedSortedData = [...reportPage.data].toSorted((a, b) => {
    // Sort by created_at DESC (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  for (let i = 0; i < expectedSortedData.length; i++) {
    TestValidator.equals(
      `report ${i} created_at`,
      expectedSortedData[i].created_at,
      reportPage.data[i].created_at,
    );
  }
  // 7. Validate pagination metadata
  TestValidator.equals("pagination current", reportPage.pagination.current, 1);
  TestValidator.equals("pagination limit", reportPage.pagination.limit, 100);
  TestValidator.equals("pagination records", reportPage.pagination.records, 3);
  TestValidator.equals("pagination pages", reportPage.pagination.pages, 1);
  // 8. Validate that created_at timestamps are in descending order
  if (reportPage.data.length >= 2) {
    for (let i = 0; i < reportPage.data.length - 1; i++) {
      TestValidator.predicate(
        "created_at DESC order",
        new Date(reportPage.data[i].created_at) >=
          new Date(reportPage.data[i + 1].created_at),
      );
    }
  }
}
