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

/**
 * Validate report update authorization and input validation for moderator
 * endpoints.
 *
 * Business context:
 *
 * - Members can file reports about posts and comments.
 * - Only moderators can update report lifecycle fields (status, assignments,
 *   reviewed_at, closed_at, resolution notes).
 *
 * This E2E test performs the following:
 *
 * 1. Register a member (reporter), create a community and a post, and file a
 *    report.
 * 2. Register a moderator account.
 * 3. As the moderator, attempt several invalid updates that should be rejected by
 *    the server (malformed timestamps, assigning a non-existent moderator id,
 *    forbidden status transition).
 * 4. Attempt the same update without authentication to validate RBAC.
 * 5. Perform a valid moderator update and assert the returned report reflects the
 *    successful change.
 */
export async function test_api_report_update_validation_and_authorization(
  connection: api.IConnection,
) {
  // 1. Reporter signs up
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterUsername =
    RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4);
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      username: reporterUsername,
      email: reporterEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(reporter);

  // 2. Create a community as the reporter
  const community =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: `test-community-${RandomGenerator.alphaNumeric(6)}`,
        slug: `tc-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a text post in the community
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
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPortalPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a report against the post
  const report = await api.functional.communityPortal.member.reports.create(
    connection,
    {
      body: {
        postId: post.id,
        reasonCode: "spam",
        reasonText: "Automated test report: suspicious promotional content",
        isUrgent: false,
        severity: "low",
      } satisfies ICommunityPortalReport.ICreate,
    },
  );
  typia.assert(report);

  // 5. Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername =
    RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: "Mod3r@t0r!",
      display_name: `mod-${RandomGenerator.name(1)}`,
    } satisfies ICommunityPortalModerator.ICreate,
  });
  typia.assert(moderator);

  // By now, `connection` holds moderator's Authorization (SDK behavior).

  // 6a. Invalid update: malformed reviewed_at timestamp should be rejected
  await TestValidator.error(
    "malformed reviewed_at timestamp should be rejected",
    async () => {
      await api.functional.communityPortal.moderator.reports.update(
        connection,
        {
          reportId: report.id,
          body: {
            // Intentionally malformed date string to trigger format validation server-side
            reviewed_at: "not-a-timestamp",
          } satisfies ICommunityPortalReport.IUpdate,
        },
      );
    },
  );

  // 6b. Invalid update: assigned_moderator_id references a non-existent UUID
  const fakeModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "assigning non-existent moderator id should be rejected",
    async () => {
      await api.functional.communityPortal.moderator.reports.update(
        connection,
        {
          reportId: report.id,
          body: {
            assigned_moderator_id: fakeModeratorId,
          } satisfies ICommunityPortalReport.IUpdate,
        },
      );
    },
  );

  // 6c. Invalid update: forbidden status transition attempt (e.g., direct CLOSE)
  await TestValidator.error(
    "forbidden status transition should be rejected",
    async () => {
      await api.functional.communityPortal.moderator.reports.update(
        connection,
        {
          reportId: report.id,
          body: {
            // Use a valid status enum but attempt a workflow transition likely disallowed
            status: "CLOSED",
          } satisfies ICommunityPortalReport.IUpdate,
        },
      );
    },
  );

  // 7. Attempt update without moderator authentication (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated caller cannot update moderator report",
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

  // 8. Perform a valid moderator update: assign to current moderator and set reviewed_at
  const updated = await api.functional.communityPortal.moderator.reports.update(
    connection,
    {
      reportId: report.id,
      body: {
        status: "IN_REVIEW",
        assigned_moderator_id: moderator.id,
        reviewed_at: new Date().toISOString(),
        is_urgent: report.isUrgent ?? false,
      } satisfies ICommunityPortalReport.IUpdate,
    },
  );
  typia.assert(updated);

  // Validate update result reflects requested changes
  TestValidator.equals(
    "updated status is IN_REVIEW",
    updated.status,
    "IN_REVIEW",
  );
  TestValidator.equals(
    "assigned moderator matches moderator id",
    updated.assignedModeratorId,
    moderator.id,
  );
}
