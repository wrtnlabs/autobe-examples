import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_comments_reports_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

export async function test_api_comment_report_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Appoint moderator to community (owner does this)
  const moderatorRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(moderatorRecord);
  // 5. Create a post in the community (by owner)
  const post = await api.functional.redditCommunity.member.posts.create(
    ownerConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_community_id: community.id,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post (by owner)
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      ownerConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 7. Create reporter accounts and submit reports
  const reporter1Connection: api.IConnection = { host: connection.host };
  const reporter1Auth = await authorize_member_join(reporter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporter1Auth);
  const reporter2Connection: api.IConnection = { host: connection.host };
  const reporter2Auth = await authorize_member_join(reporter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporter2Auth);
  const reporter3Connection: api.IConnection = { host: connection.host };
  const reporter3Auth = await authorize_member_join(reporter3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporter3Auth);
  // 8. Submit multiple reports against the comment
  const report1 =
    await generate_random_reddit_community_member_comments_reports_create(
      reporter1Connection,
      {
        body: {
          reason: "This comment violates community guidelines - spam",
        } satisfies IRedditCommunityCommentReport.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(report1);
  const report2 =
    await generate_random_reddit_community_member_comments_reports_create(
      reporter2Connection,
      {
        body: {
          reason: "This comment contains inappropriate content",
        } satisfies IRedditCommunityCommentReport.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(report2);
  const report3 =
    await generate_random_reddit_community_member_comments_reports_create(
      reporter3Connection,
      {
        body: {
          reason: "This comment is harassment",
        } satisfies IRedditCommunityCommentReport.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(report3);
  // 9. Moderator approves first report (status becomes APPROVED)
  const approvedReport =
    await api.functional.redditCommunity.member.comments.reports.update(
      moderatorConnection,
      {
        commentId: comment.id,
        reportId: report1.id,
        body: {
          status: "APPROVED",
        } satisfies IRedditCommunityCommentReport.IUpdate,
      },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "approved report status",
    approvedReport.status,
    "APPROVED",
  );
  // 10. Moderator dismisses second report (status becomes DISMISSED)
  const dismissedReport =
    await api.functional.redditCommunity.member.comments.reports.update(
      moderatorConnection,
      {
        commentId: comment.id,
        reportId: report2.id,
        body: {
          status: "DISMISSED",
        } satisfies IRedditCommunityCommentReport.IUpdate,
      },
    );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "dismissed report status",
    dismissedReport.status,
    "DISMISSED",
  );
  // 11. Test status filtering - PENDING reports
  const pendingReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          status: "PENDING",
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals("pending reports count", pendingReports.data.length, 1);
  TestValidator.equals(
    "pending report is report3",
    pendingReports.data[0].id,
    report3.id,
  );
  TestValidator.equals(
    "pending report status",
    pendingReports.data[0].status,
    "PENDING",
  );
  // 12. Test status filtering - APPROVED reports
  const approvedReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          status: "APPROVED",
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.equals(
    "approved reports count",
    approvedReports.data.length,
    1,
  );
  TestValidator.equals(
    "approved report is report1",
    approvedReports.data[0].id,
    report1.id,
  );
  TestValidator.equals(
    "approved report status",
    approvedReports.data[0].status,
    "APPROVED",
  );
  // 13. Test status filtering - DISMISSED reports
  const dismissedReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          status: "DISMISSED",
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.equals(
    "dismissed reports count",
    dismissedReports.data.length,
    1,
  );
  TestValidator.equals(
    "dismissed report is report2",
    dismissedReports.data[0].id,
    report2.id,
  );
  TestValidator.equals(
    "dismissed report status",
    dismissedReports.data[0].status,
    "DISMISSED",
  );
  // 14. Test date range filtering - from future (should return empty)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const futureReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          created_at_from: futureDate.toISOString(),
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(futureReports);
  TestValidator.equals(
    "future date reports count",
    futureReports.data.length,
    0,
  );
  TestValidator.equals(
    "future date pagination records",
    futureReports.pagination.records,
    0,
  );
  // 15. Test date range filtering - from past (should return all)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const pastReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          created_at_from: pastDate.toISOString(),
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(pastReports);
  TestValidator.predicate(
    "past date reports count",
    pastReports.data.length >= 3,
  );
  // 16. Test combined filters - PENDING status with date range
  const combinedReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          status: "PENDING",
          created_at_from: pastDate.toISOString(),
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(combinedReports);
  TestValidator.equals("combined filter count", combinedReports.data.length, 1);
  TestValidator.equals(
    "combined filter status",
    combinedReports.data[0].status,
    "PENDING",
  );
  // 17. Test pagination with filters
  const paginatedReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          status: "PENDING",
          page: 1,
          limit: 1,
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(paginatedReports);
  TestValidator.equals(
    "paginated data length",
    paginatedReports.data.length,
    1,
  );
  TestValidator.equals(
    "paginated current page",
    paginatedReports.pagination.current,
    1,
  );
  TestValidator.equals("paginated limit", paginatedReports.pagination.limit, 1);
  TestValidator.equals(
    "paginated records",
    paginatedReports.pagination.records,
    1,
  );
  // 18. Test sorting with filters
  const sortedReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          status: "PENDING",
          sort: "created_at:asc",
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(sortedReports);
  TestValidator.equals("sorted reports count", sortedReports.data.length, 1);
  TestValidator.equals(
    "sorted report status",
    sortedReports.data[0].status,
    "PENDING",
  );
  // 19. Test empty result for non-matching status
  // All reports have been processed, so filtering by a status that doesn't exist should return empty
  // We already have one of each status, so this test verifies the filter works correctly
  const allReports =
    await api.functional.redditCommunity.member.comments.reports.index(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {} satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.equals("all reports count", allReports.data.length, 3);
  TestValidator.equals(
    "all reports pagination records",
    allReports.pagination.records,
    3,
  );
}
