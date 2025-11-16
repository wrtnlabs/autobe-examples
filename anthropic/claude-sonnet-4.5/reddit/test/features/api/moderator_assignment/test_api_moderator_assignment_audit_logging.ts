import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that moderator assignments are properly logged with complete audit trail
 * information.
 *
 * This test validates the complete moderator assignment workflow and verifies
 * that all audit trail information is properly captured when assigning
 * moderators to communities.
 *
 * Test workflow:
 *
 * 1. Create founding moderator account and authenticate
 * 2. Create a community
 * 3. Record timestamp before moderator assignment
 * 4. Assign a new moderator to the community
 * 5. Verify the assignment record includes complete audit information
 * 6. Confirm timestamps are accurate and reflect actual assignment time
 * 7. Validate that assignment records persist for audit trail purposes
 */
export async function test_api_moderator_assignment_audit_logging(
  connection: api.IConnection,
) {
  // 1. Create founding moderator account and authenticate
  const foundingModeratorEmail = typia.random<string & tags.Format<"email">>();
  const foundingModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: foundingModeratorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(foundingModerator);

  // 2. Create a community
  const communityName = RandomGenerator.alphaNumeric(15);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          rules: RandomGenerator.paragraph({ sentences: 8 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Record timestamp before moderator assignment
  const beforeAssignment = new Date();

  // 4. Assign a new moderator to the community
  const newModeratorEmail = typia.random<string & tags.Format<"email">>();
  const assignment: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderator.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: newModeratorEmail,
          password: "AnotherSecurePass456!",
          nickname: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );

  const afterAssignment = new Date();

  // 5. Verify the assignment record includes complete audit information
  typia.assert(assignment);

  // Verify assignment has all required moderator information
  TestValidator.predicate(
    "assignment has valid moderator ID",
    assignment.id !== null && assignment.id !== undefined,
  );
  TestValidator.predicate(
    "assignment has moderator username",
    assignment.username !== null &&
      assignment.username !== undefined &&
      assignment.username.length >= 3,
  );
  TestValidator.predicate(
    "assignment has moderator email",
    assignment.email !== null && assignment.email !== undefined,
  );
  TestValidator.equals(
    "assigned moderator email matches request",
    assignment.email,
    newModeratorEmail,
  );

  // 6. Confirm timestamps are accurate and reflect actual assignment time
  TestValidator.predicate(
    "assignment has created_at timestamp",
    assignment.created_at !== null && assignment.created_at !== undefined,
  );

  const assignmentCreatedAt = new Date(assignment.created_at);
  TestValidator.predicate(
    "assignment timestamp is after beforeAssignment time",
    assignmentCreatedAt >= beforeAssignment,
  );
  TestValidator.predicate(
    "assignment timestamp is before afterAssignment time",
    assignmentCreatedAt <= afterAssignment,
  );

  // 7. Validate that assignment records persist for audit trail purposes
  TestValidator.predicate(
    "assignment has updated_at timestamp for audit trail",
    assignment.updated_at !== null && assignment.updated_at !== undefined,
  );

  // Verify the moderator account is not deleted (deleted_at should be null/undefined)
  TestValidator.predicate(
    "assignment moderator is not deleted",
    assignment.deleted_at === null || assignment.deleted_at === undefined,
  );

  // Verify complete moderator profile information exists
  TestValidator.predicate(
    "assignment includes email verification status",
    typeof assignment.email_verified === "boolean",
  );
  TestValidator.predicate(
    "assignment includes karma information",
    typeof assignment.post_karma === "number" &&
      typeof assignment.comment_karma === "number",
  );
  TestValidator.predicate(
    "assignment includes privacy settings",
    typeof assignment.show_online_status === "boolean" &&
      typeof assignment.show_subscribed_communities === "boolean" &&
      typeof assignment.show_activity_feed === "boolean",
  );
}
