import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
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
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

/**
 * Test pagination and filtering capabilities for pending reports.
 *
 * Validates the complete pending reports workflow including member authentication, community creation, moderator assignment, content creation, report filing, and pagination/filtering operations. Ensures that the pagination metadata is accurate, filtering by report type works correctly, and sorting maintains chronological order.
 *
 * Special attention is given to verifying that the pagination metadata correctly reflects the total record count, that filtered results contain only the specified report type, and that sorted results maintain proper ascending/descending order based on creation timestamps.
 *
 * 1. Member registers and authenticates with randomized credentials.
 * 2. Community is created with unique name and description.
 * 3. Member is assigned as moderator of the community.
 * 4. Multiple posts and comments are created as report targets.
 * 5. 25+ pending reports are filed with mixed report types.
 * 6. Pagination tested with page 1, limit 10 - validates metadata.
 * 7. Filter tested with report_type 'post' - validates filtering.
 * 8. Sort tested with created_at ascending - validates ordering.
 */
export async function test_api_report_pending_pagination_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 3. Assign member as moderator
  const moderator =
    await generate_random_reddit_community_member_communities_moderators_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: memberAuth.id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderator);
  // 4. Create 15 posts for report targets
  const posts: IRedditCommunityPost[] = await ArrayUtil.asyncRepeat(
    15,
    async () => {
      const post = await generate_random_reddit_community_posts_create(
        memberConnection,
        {
          body: {
            community_id: community.id,
          },
        },
      );
      return post;
    },
  );
  // 5. Create 15 comments on posts for report targets
  const comments: IRedditCommunityComment[] = await ArrayUtil.asyncRepeat(
    15,
    async (index) => {
      const comment =
        await generate_random_reddit_community_member_posts_comments_create(
          memberConnection,
          {
            params: { postId: posts[index % posts.length].id },
          },
        );
      return comment;
    },
  );
  // 6. File 25+ pending reports with mixed types
  const reports: IRedditCommunityReport[] = await ArrayUtil.asyncRepeat(
    28,
    async (index) => {
      const isPostReport = index % 2 === 0;
      const report =
        await generate_random_reddit_community_member_reports_create(
          memberConnection,
          {
            body: {
              report_type: isPostReport ? "post" : "comment",
              target_id: isPostReport
                ? posts[index % posts.length].id
                : comments[index % comments.length].id,
              reason: RandomGenerator.paragraph({ sentences: 2 }),
            },
          },
        );
      return report;
    },
  );
  // 7. Test pagination: page 1, limit 10
  const paginatedResult =
    await api.functional.redditCommunity.member.communities.reports.pending.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 25",
    paginatedResult.pagination.records >= 25,
  );
  TestValidator.predicate(
    "pagination pages >= 3",
    paginatedResult.pagination.pages >= 3,
  );
  TestValidator.equals(
    "data length matches limit",
    paginatedResult.data.length,
    10,
  );
  // 8. Test filter: report_type 'post'
  const filteredResult =
    await api.functional.redditCommunity.member.communities.reports.pending.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          report_type: "post",
          status: "pending",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Validate all filtered results are post reports
  filteredResult.data.forEach((report, index) => {
    TestValidator.equals(
      `report ${index} type is post`,
      report.reportType,
      "post",
    );
  });
  TestValidator.predicate(
    "filtered results contain only post reports",
    filteredResult.data.every((r) => r.reportType === "post"),
  );
  // 9. Test sorting: created_at ascending
  const sortedResult =
    await api.functional.redditCommunity.member.communities.reports.pending.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "created_at",
          order: "asc",
          status: "pending",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Validate ascending order
  if (sortedResult.data.length > 1) {
    for (let i = 1; i < sortedResult.data.length; i++) {
      const prevDate = new Date(sortedResult.data[i - 1].createdAt).getTime();
      const currDate = new Date(sortedResult.data[i].createdAt).getTime();
      TestValidator.predicate(
        `report ${i} created after report ${i - 1}`,
        currDate >= prevDate,
      );
    }
  }
  // 10. Validate report structure with business logic checks
  paginatedResult.data.forEach((report, index) => {
    TestValidator.predicate(
      `report ${index} has non-empty reason`,
      report.reason.length > 0,
    );
    TestValidator.equals(
      `report ${index} status is pending`,
      report.status,
      "pending",
    );
  });
}
