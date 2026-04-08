import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

/**
 * Test filtering and sorting functionality for report retrieval.
 *
 * Validates the complete report filtering and sorting workflow including member authentication, content creation (community, post, comment), multiple report submission with different types, and comprehensive filtering/sorting/pagination tests.
 *
 * Special attention is given to verifying that filters correctly narrow down results by status and report type, date range filtering works with created_after and created_before parameters, sorting produces correct chronological order in both ascending and descending directions, and pagination returns accurate metadata with correct record counts per page.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Member creates a community for content.
 * 3. Member creates a post in the community.
 * 4. Member creates a comment on the post.
 * 5. Member creates multiple reports: one on post, one on comment.
 * 6. Test filtering by status=pending.
 * 7. Test filtering by report_type=comment.
 * 8. Test sorting by created_at ascending and descending.
 * 9. Test pagination with limit=1 verifying correct metadata.
 */
export async function test_api_report_list_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. Create multiple reports - one on post, one on comment
  const postReport =
    await generate_random_reddit_community_member_reports_create(
      memberConnection,
      {
        body: {
          report_type: "post",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(postReport);
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const commentReport =
    await generate_random_reddit_community_member_reports_create(
      memberConnection,
      {
        body: {
          report_type: "comment",
          target_id: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(commentReport);
  // 6. Test filtering by status=pending
  const pendingReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          status: "pending",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "all reports are pending",
    pendingReports.data.every((r) => r.status === "pending"),
  );
  TestValidator.predicate(
    "has at least 2 pending reports",
    pendingReports.data.length >= 2,
  );
  // 7. Test filtering by report_type=comment
  const commentReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          report_type: "comment",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(commentReports);
  TestValidator.predicate(
    "all reports are comment type",
    commentReports.data.every((r) => r.reportType === "comment"),
  );
  TestValidator.predicate(
    "has at least 1 comment report",
    commentReports.data.length >= 1,
  );
  // 8. Test filtering by report_type=post
  const postReports = await api.functional.redditCommunity.member.reports.index(
    memberConnection,
    {
      body: {
        report_type: "post",
      } satisfies IRedditCommunityReport.IRequest,
    },
  );
  typia.assert(postReports);
  TestValidator.predicate(
    "all reports are post type",
    postReports.data.every((r) => r.reportType === "post"),
  );
  TestValidator.predicate(
    "has at least 1 post report",
    postReports.data.length >= 1,
  );
  // 9. Test sorting by created_at descending (default)
  const sortedDesc = await api.functional.redditCommunity.member.reports.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        order: "desc",
      } satisfies IRedditCommunityReport.IRequest,
    },
  );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "descending order - earlier items have later timestamps",
    sortedDesc.data.length < 2 ||
      new Date(sortedDesc.data[0].createdAt).getTime() >=
        new Date(sortedDesc.data[1].createdAt).getTime(),
  );
  // 10. Test sorting by created_at ascending
  const sortedAsc = await api.functional.redditCommunity.member.reports.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        order: "asc",
      } satisfies IRedditCommunityReport.IRequest,
    },
  );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "ascending order - earlier items have earlier timestamps",
    sortedAsc.data.length < 2 ||
      new Date(sortedAsc.data[0].createdAt).getTime() <=
        new Date(sortedAsc.data[1].createdAt).getTime(),
  );
  // 11. Test date range filtering with created_after
  const afterDate = new Date(postReport.created_at);
  const reportsAfter =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          created_after: afterDate.toISOString(),
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsAfter);
  TestValidator.predicate(
    "all reports created after specified date",
    reportsAfter.data.every(
      (r) => new Date(r.createdAt).getTime() >= afterDate.getTime(),
    ),
  );
  // 12. Test pagination with limit=1
  const page1 = await api.functional.redditCommunity.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IRedditCommunityReport.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has 1 item", page1.data.length, 1);
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 1", page1.pagination.limit, 1);
  TestValidator.predicate("total records >= 2", page1.pagination.records >= 2);
  TestValidator.predicate("total pages >= 2", page1.pagination.pages >= 2);
  // 13. Test pagination page 2
  const page2 = await api.functional.redditCommunity.member.reports.index(
    memberConnection,
    {
      body: {
        limit: 1,
        page: 2,
      } satisfies IRedditCommunityReport.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has 1 item", page2.data.length, 1);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.notEquals(
    "page 1 and 2 have different reports",
    page1.data[0].id,
    page2.data[0].id,
  );
  // 14. Verify pagination metadata consistency
  TestValidator.equals(
    "page 1 and 2 have same total records",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "page 1 and 2 have same total pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );
}
