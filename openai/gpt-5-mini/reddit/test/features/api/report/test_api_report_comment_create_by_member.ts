import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

/**
 * E2E test: Member files a report against an existing comment.
 *
 * Business scenario:
 *
 * 1. Register a new member and obtain authorization token.
 * 2. Create a community to host a post.
 * 3. If community is private, subscribe the member so posting/commenting is
 *    allowed.
 * 4. Create a text post in the community.
 * 5. Create a top-level comment under the post.
 * 6. File a moderation report for the comment and validate returned report
 *    properties.
 * 7. Validate unauthorized, missing-field, and non-existent-target error
 *    behaviors.
 */
export async function test_api_report_comment_create_by_member(
  connection: api.IConnection,
) {
  // 1) Member registration (join)
  const memberBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a community
  const communityBody = {
    name: `com-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Subscribe if community requires membership
  if (community.is_private === true) {
    const subscriptionBody = {
      community_id: community.id,
    } satisfies ICommunityPortalSubscription.ICreate;

    const subscription: ICommunityPortalSubscription =
      await api.functional.communityPortal.member.communities.subscriptions.create(
        connection,
        {
          communityId: community.id,
          body: subscriptionBody,
        },
      );
    typia.assert(subscription);
  }

  // 4) Create a text post in the community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5) Create a comment under the post
  const commentBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 6) File a moderation report for the created comment
  const reportBody = {
    reasonCode: "spam",
    reasonText: RandomGenerator.paragraph({ sentences: 4 }),
    isUrgent: false,
    severity: "low",
    reporterContactEmail: typia.random<string & tags.Format<"email">>(),
  } satisfies ICommunityPortalReport.ICreate;

  const report: ICommunityPortalReport =
    await api.functional.communityPortal.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: reportBody,
      },
    );
  typia.assert(report);

  // Business and shape validations
  TestValidator.equals(
    "report reporterUserId matches member.id",
    report.reporterUserId,
    member.id,
  );
  TestValidator.equals(
    "report commentId is created comment",
    report.commentId,
    comment.id,
  );
  // If the server populated postId/communityId, they should match created values
  if (report.postId !== null && report.postId !== undefined) {
    TestValidator.equals(
      "report.postId matches created post",
      report.postId,
      post.id,
    );
  }
  if (report.communityId !== null && report.communityId !== undefined) {
    TestValidator.equals(
      "report.communityId matches created community",
      report.communityId,
      community.id,
    );
  }

  // typia.assert already validated createdAt format; additionally check existence
  TestValidator.predicate(
    "report has createdAt",
    typeof report.createdAt === "string" && report.createdAt.length > 0,
  );
  TestValidator.predicate(
    "assignedModeratorId is null or undefined",
    report.assignedModeratorId === null ||
      report.assignedModeratorId === undefined,
  );
  TestValidator.predicate(
    "closedByModeratorId is null or undefined",
    report.closedByModeratorId === null ||
      report.closedByModeratorId === undefined,
  );
  // resolutionNotes should not be exposed to ordinary members
  TestValidator.predicate(
    "resolutionNotes not exposed to ordinary members",
    report.resolutionNotes === null || report.resolutionNotes === undefined,
  );

  // If server uses 'OPEN' as initial status, ensure it; otherwise at least ensure status is a non-empty string
  if (report.status === "OPEN") {
    TestValidator.equals(
      "report status initialized to OPEN",
      report.status,
      "OPEN",
    );
  } else {
    TestValidator.predicate(
      "report status is non-empty string",
      typeof report.status === "string" && report.status.length > 0,
    );
  }

  // --- Negative cases ---
  // Unauthenticated request should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated member cannot create report",
    async () => {
      await api.functional.communityPortal.member.comments.reports.create(
        unauthConn,
        {
          commentId: comment.id,
          body: reportBody,
        },
      );
    },
  );

  // Reporting non-existent comment should cause error
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reporting non-existent comment fails",
    async () => {
      await api.functional.communityPortal.member.comments.reports.create(
        connection,
        {
          commentId: fakeCommentId,
          body: reportBody,
        },
      );
    },
  );

  // Missing reasonCode should fail (validation error)
  await TestValidator.error(
    "missing reasonCode should return validation error",
    async () => {
      const badBody = {
        reasonText: "missing reason code",
      } satisfies ICommunityPortalReport.ICreate;

      await api.functional.communityPortal.member.comments.reports.create(
        connection,
        {
          commentId: comment.id,
          body: badBody,
        },
      );
    },
  );
}
