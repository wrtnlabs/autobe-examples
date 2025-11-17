import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

/**
 * Test creation of a moderation action referencing a comment report.
 *
 * This test validates that moderators can create actions for comment
 * violations, properly linking to the reported comment and its parent post. The
 * test ensures that the system correctly handles comment-specific moderation
 * actions with all required associations.
 *
 * Test flow:
 *
 * 1. Create a regular user and a moderator
 * 2. Create a community
 * 3. Create a post in that community
 * 4. Create a comment on that post
 * 5. Report the comment as the regular user
 * 6. Authenticate as moderator
 * 7. Create a moderation action referencing the comment report
 * 8. Validate the moderation action was created correctly
 */
export async function test_api_moderation_action_creation_with_comment_reference(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoinData = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s/g, "_") +
      "_" +
      RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 2: Create a moderator
  const moderatorJoinData = {
    email: `${RandomGenerator.alphabets(10)}@moderator.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s/g, "_") +
      "_" +
      RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const moderatorUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: moderatorJoinData,
    });
  typia.assert(moderatorUser);

  // Create moderator role for the user
  const moderatorCreateData = {
    community_forum_user_id: moderatorUser.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderator);

  // Step 3: Login as regular user
  const userLoginData = {
    email: userJoinData.email,
    password: userJoinData.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityUser.ILogin;

  await api.functional.auth.user.login(connection, {
    body: userLoginData,
  });

  // Step 4: Create a community
  const communityCreateData = {
    name:
      RandomGenerator.name(2).replace(/\s/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    slug:
      RandomGenerator.name(1).toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    rules: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreateData,
    });
  typia.assert(community);

  // Step 5: Create a post in the community
  const postCreateData = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(5),
    type: "text",
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreateData,
    });
  typia.assert(post);

  // Step 6: Create a comment on the post
  const commentCreateData = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    href: "http://localhost:3000/post/" + post.id,
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreateData,
    });
  typia.assert(comment);

  // Step 7: Report the comment
  const reportCreateData = {
    actor_type: "comment",
    reason: "harassment",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    community_forum_comment_id: comment.id,
    href: "http://localhost:3000/comment/" + comment.id,
    referrer: "http://localhost:3000/post/" + post.id,
  } satisfies ICommunityForumCommunityReport.ICreate;

  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: reportCreateData,
    });
  typia.assert(report);

  // Step 8: Login as moderator
  const moderatorLoginData = {
    email: moderatorJoinData.email,
    password: moderatorJoinData.password,
    href: "http://localhost:3000/moderator/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginData,
  });

  // Step 9: Create a moderation action referencing the comment report
  const moderationActionCreateData = {
    action_type: "remove_content",
    reason: "Comment violates community guidelines on harassment",
    details:
      "The comment contained inappropriate language and personal attacks",
    community_forum_report_id: report.id,
    community_forum_community_id: community.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies ICommunityForumCommunityModerationAction.ICreate;

  const moderationAction: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: moderationActionCreateData,
      },
    );
  typia.assert(moderationAction);

  // Step 10: Validate the moderation action
  TestValidator.equals(
    "moderation action should reference the correct report",
    moderationAction.community_forum_report_id,
    report.id,
  );

  TestValidator.equals(
    "moderation action should reference the correct community",
    moderationAction.community_forum_community_id,
    community.id,
  );

  TestValidator.equals(
    "moderation action should have the correct action type",
    moderationAction.action_type,
    "remove_content",
  );

  TestValidator.equals(
    "moderation action should have the correct reason",
    moderationAction.reason,
    "Comment violates community guidelines on harassment",
  );
}
