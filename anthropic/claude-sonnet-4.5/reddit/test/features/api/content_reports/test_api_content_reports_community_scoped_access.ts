import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeContentReport";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that moderators can only access content reports for communities they
 * have moderation permissions in.
 *
 * This test validates the access control requirement that moderators' report
 * visibility is scoped to their moderation jurisdiction. The test creates two
 * separate communities with different primary moderators, generates posts and
 * reports in each community, then confirms that moderator A can only see
 * reports from community A and moderator B can only see reports from community
 * B.
 *
 * Test workflow:
 *
 * 1. Create two moderator accounts using separate connections
 * 2. Each moderator creates their own community
 * 3. Create a member account to submit posts and reports
 * 4. Member creates posts in both communities
 * 5. Member submits content reports for posts in both communities
 * 6. ModeratorA retrieves reports filtered by communityA
 * 7. ModeratorB retrieves reports filtered by communityB
 * 8. Validate that each moderator only sees reports from their respective
 *    communities
 */
export async function test_api_content_reports_community_scoped_access(
  connection: api.IConnection,
) {
  // Step 1: Create separate connections for each moderator to maintain independent auth sessions
  const connectionModeratorA: api.IConnection = { ...connection };
  const connectionModeratorB: api.IConnection = { ...connection };
  const connectionMember: api.IConnection = { ...connection };

  // Step 2: Register first moderator account
  const moderatorA: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connectionModeratorA, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderatorA);

  // Step 3: ModeratorA creates communityA
  const communityA: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(
      connectionModeratorA,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          privacy_type: "public",
          posting_permission: "anyone_subscribed",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          primary_category: "technology",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // Step 4: Register second moderator account
  const moderatorB: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connectionModeratorB, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderatorB);

  // Step 5: ModeratorB creates communityB
  const communityB: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(
      connectionModeratorB,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          privacy_type: "public",
          posting_permission: "anyone_subscribed",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          primary_category: "science",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // Step 6: Create member account to submit posts and reports
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connectionMember, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 7: Member creates post in communityA
  const postA: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connectionMember, {
      body: {
        community_id: communityA.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(postA);

  // Step 8: Member creates post in communityB
  const postB: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connectionMember, {
      body: {
        community_id: communityB.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(postB);

  // Step 9: Member submits content report for postA in communityA
  const reportA: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connectionMember, {
      body: {
        reported_post_id: postA.id,
        community_id: communityA.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(reportA);

  // Step 10: Member submits content report for postB in communityB
  const reportB: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connectionMember, {
      body: {
        reported_post_id: postB.id,
        community_id: communityB.id,
        content_type: "post",
        violation_categories: "hate_speech",
        additional_context: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(reportB);

  // Step 11: ModeratorA retrieves reports filtered by communityA
  const reportsForModeratorA: IPageIRedditLikeContentReport =
    await api.functional.redditLike.moderator.content_reports.index(
      connectionModeratorA,
      {
        body: {
          community_id: communityA.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeContentReport.IRequest,
      },
    );
  typia.assert(reportsForModeratorA);

  // Step 12: Validate that moderatorA only sees reports from communityA
  TestValidator.predicate(
    "moderatorA should have access to reports",
    reportsForModeratorA.data.length > 0,
  );

  const hasReportA = reportsForModeratorA.data.some(
    (report) => report.id === reportA.id,
  );
  TestValidator.predicate(
    "moderatorA should see reportA from communityA",
    hasReportA,
  );

  const hasReportB = reportsForModeratorA.data.some(
    (report) => report.id === reportB.id,
  );
  TestValidator.predicate(
    "moderatorA should NOT see reportB from communityB",
    !hasReportB,
  );

  // Step 13: ModeratorB retrieves reports filtered by communityB
  const reportsForModeratorB: IPageIRedditLikeContentReport =
    await api.functional.redditLike.moderator.content_reports.index(
      connectionModeratorB,
      {
        body: {
          community_id: communityB.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeContentReport.IRequest,
      },
    );
  typia.assert(reportsForModeratorB);

  // Step 14: Validate that moderatorB only sees reports from communityB
  TestValidator.predicate(
    "moderatorB should have access to reports",
    reportsForModeratorB.data.length > 0,
  );

  const moderatorBHasReportB = reportsForModeratorB.data.some(
    (report) => report.id === reportB.id,
  );
  TestValidator.predicate(
    "moderatorB should see reportB from communityB",
    moderatorBHasReportB,
  );

  const moderatorBHasReportA = reportsForModeratorB.data.some(
    (report) => report.id === reportA.id,
  );
  TestValidator.predicate(
    "moderatorB should NOT see reportA from communityA",
    !moderatorBHasReportA,
  );
}
