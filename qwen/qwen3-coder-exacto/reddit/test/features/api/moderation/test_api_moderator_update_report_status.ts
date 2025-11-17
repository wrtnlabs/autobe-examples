import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

/**
 * Test that moderators can update the status and details of existing content
 * reports.
 *
 * This test verifies that moderators can update report status through the
 * moderation workflow (pending, under_review, resolved, dismissed) and update
 * categorization information. The test ensures that only moderators can access
 * this endpoint and that updates are properly applied to the report record.
 *
 * Test workflow:
 *
 * 1. Create a regular user and moderator accounts
 * 2. Create a community and a post within that community
 * 3. Create a report on the post as a regular user
 * 4. Attempt to update the report as a regular user (should fail)
 * 5. Update the report as a moderator with new status and information
 * 6. Verify the updated report contains the correct information
 */
export async function test_api_moderator_update_report_status(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(1)
      .replace(/[^a-zA-Z0-9_]/g, "")
      .substring(0, 20),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 2: Create a community with the user
  const communityData = {
    name: `community_${RandomGenerator.alphabets(10)}`,
    slug: `community-${RandomGenerator.alphabets(10)}`,
    title: "Test Community",
    description: "A test community for report functionality",
    rules: "Be respectful and follow community guidelines",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postData = {
    community_forum_community_id: community.id,
    title: "Test Post for Reporting",
    type: "text",
    body: "This is a test post that will be reported",
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a report on the post as the user
  const reportData = {
    actor_type: "post",
    reason: "spam",
    description: "This post appears to be spam content",
    community_forum_post_id: post.id,
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumCommunityReport.ICreate;

  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 5: Create a moderator account
  // First login as the user who will become a moderator
  await api.functional.auth.user.login(connection, {
    body: {
      email: user.email,
      password: "password123",
      href: "http://localhost/login",
      referrer: "http://localhost/home",
    } satisfies ICommunityForumCommunityUser.ILogin,
  });

  // Create moderator with the user
  const moderatorData = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 6: Attempt to update the report as a regular user (should fail)
  await api.functional.auth.user.login(connection, {
    body: {
      email: user.email,
      password: "password123",
      href: "http://localhost/login",
      referrer: "http://localhost/home",
    } satisfies ICommunityForumCommunityUser.ILogin,
  });

  await TestValidator.error("regular user cannot update report", async () => {
    await api.functional.communityForum.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "under_review",
      } satisfies ICommunityForumCommunityReport.IUpdate,
    });
  });

  // Step 7: Update the report as a moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: user.email,
      password: "password123",
      href: "http://localhost/moderator-login",
      referrer: "http://localhost/moderator-panel",
    } satisfies ICommunityForumCommunityModerator.ILogin,
  });

  const updateData = {
    status: "under_review",
    reason: "harassment",
    description: "Updated: This post contains harassment content",
  } satisfies ICommunityForumCommunityReport.IUpdate;

  const updatedReport: ICommunityForumCommunityReport =
    await api.functional.communityForum.moderator.reports.update(connection, {
      reportId: report.id,
      body: updateData,
    });
  typia.assert(updatedReport);

  // Step 8: Verify the updated report contains the correct information
  TestValidator.equals("report ID should match", updatedReport.id, report.id);

  TestValidator.equals(
    "report status should be updated",
    updatedReport.status,
    "under_review",
  );

  TestValidator.equals(
    "report reason should be updated",
    updatedReport.reason,
    "harassment",
  );

  TestValidator.equals(
    "report description should be updated",
    updatedReport.description,
    "Updated: This post contains harassment content",
  );

  TestValidator.predicate(
    "report updated_at should be more recent than created_at",
    () =>
      new Date(updatedReport.updated_at).getTime() >
      new Date(report.created_at).getTime(),
  );
}
