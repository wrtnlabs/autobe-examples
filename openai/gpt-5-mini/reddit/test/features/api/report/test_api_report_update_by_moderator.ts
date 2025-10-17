import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

/**
 * Validate the moderator-driven report lifecycle updates in CommunityPortal.
 *
 * Workflow:
 *
 * 1. Register a member (authorUser) and obtain member token
 * 2. Create a community as the member
 * 3. Subscribe the member to the community (safety step)
 * 4. Create a text post in the community as the member
 * 5. Create a report for the post as the member (initial status OPEN)
 * 6. Register a moderator and obtain moderator token
 * 7. As moderator, update the report through states: IN_REVIEW -> REQUIRES_ACTION
 *    -> CLOSED
 * 8. Validate each update reflects the correct fields (status,
 *    assignedModeratorId, reviewedAt, closedAt, resolutionNotes)
 * 9. Assert invalid transition and unauthorized update produce errors
 */
export async function test_api_report_update_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create author member account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: `author_${RandomGenerator.alphaNumeric(6)}`,
      email: authorEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(author);

  // 2) Create community as author
  const community =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: `${RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "-")}-${RandomGenerator.alphaNumeric(4)}`,
        description: RandomGenerator.paragraph({ sentences: 6 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.predicate("community has id", typeof community.id === "string");

  // 3) Optional: Subscribe author to the community to satisfy membership requirements
  const subscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription belongs to community",
    subscription.community_id,
    community.id,
  );

  // 4) Create a text post in the community
  const post = await api.functional.communityPortal.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 6,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ICommunityPortalPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community_id,
    community.id,
  );

  // 5) Create a report for the post
  const report = await api.functional.communityPortal.member.reports.create(
    connection,
    {
      body: {
        post_id: post.id,
        reason_code: "spam",
        reason_text: "Automated test report: please triage",
        is_urgent: false,
      } satisfies ICommunityPortalReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.predicate("report id exists", typeof report.id === "string");
  TestValidator.predicate(
    "initial report status present",
    typeof report.status === "string",
  );

  // 6) Create moderator account (this will set connection Authorization to moderator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `mod_${RandomGenerator.alphaNumeric(6)}`,
      email: moderatorEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator id exists",
    typeof moderator.id === "string",
  );

  // 7a) Moderator assigns report and sets IN_REVIEW
  const updatedInReview =
    await api.functional.communityPortal.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "IN_REVIEW",
        assigned_moderator_id: moderator.id,
      } satisfies ICommunityPortalReport.IUpdate,
    });
  typia.assert(updatedInReview);
  TestValidator.equals(
    "report status -> IN_REVIEW",
    updatedInReview.status,
    "IN_REVIEW",
  );
  TestValidator.equals(
    "assigned moderator id matches",
    updatedInReview.assignedModeratorId,
    moderator.id,
  );

  // 7b) Moderator marks REQUIRES_ACTION with reviewed_at timestamp
  const reviewedAt = new Date().toISOString();
  const updatedRequiresAction =
    await api.functional.communityPortal.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "REQUIRES_ACTION",
        reviewed_at: reviewedAt,
      } satisfies ICommunityPortalReport.IUpdate,
    });
  typia.assert(updatedRequiresAction);
  TestValidator.equals(
    "report status -> REQUIRES_ACTION",
    updatedRequiresAction.status,
    "REQUIRES_ACTION",
  );
  TestValidator.predicate(
    "reviewedAt is present",
    updatedRequiresAction.reviewedAt !== null &&
      updatedRequiresAction.reviewedAt !== undefined,
  );

  // 7c) Moderator closes the report
  const closedAt = new Date().toISOString();
  const resolution = "Closed by moderator after review - resolved in test.";
  const updatedClosed =
    await api.functional.communityPortal.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "CLOSED",
        closed_at: closedAt,
        closed_by_moderator_id: moderator.id,
        resolution_notes: resolution,
      } satisfies ICommunityPortalReport.IUpdate,
    });
  typia.assert(updatedClosed);
  TestValidator.equals(
    "report status -> CLOSED",
    updatedClosed.status,
    "CLOSED",
  );
  TestValidator.equals(
    "resolution notes set",
    updatedClosed.resolutionNotes,
    resolution,
  );
  TestValidator.predicate(
    "closedAt present",
    updatedClosed.closedAt !== null && updatedClosed.closedAt !== undefined,
  );

  // 8) Invalid transition: attempt to reopen to OPEN should throw
  await TestValidator.error("invalid transition should throw", async () => {
    await api.functional.communityPortal.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "OPEN",
      } satisfies ICommunityPortalReport.IUpdate,
    });
  });

  // 9) Unauthorized attempt: unauthenticated connection cannot update
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated caller cannot update report",
    async () => {
      await api.functional.communityPortal.moderator.reports.update(
        unauthConn,
        {
          reportId: report.id,
          body: {
            status: "IN_REVIEW",
          } satisfies ICommunityPortalReport.IUpdate,
        },
      );
    },
  );
}
