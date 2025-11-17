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

export async function test_api_moderation_action_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";
  const userUsername =
    RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() + "_user";

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        username: userUsername,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityName =
    RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() + "-community";
  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: {
        name: communityName,
        slug: communityName,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: {
        community_forum_community_id: community.id,
        title: postTitle,
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityForumCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: {
        body: RandomGenerator.paragraph({ sentences: 4 }),
        href: "http://localhost:3000/post/" + post.id,
        referrer: "http://localhost:3000/community/" + community.id,
      } satisfies ICommunityForumPostComment.ICreate,
    });
  typia.assert(comment);

  // Step 5: Report the comment
  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: {
        actor_type: "comment",
        reason: "harassment",
        description: RandomGenerator.paragraph({ sentences: 5 }),
        community_forum_comment_id: comment.id,
        href: "http://localhost:3000/post/" + post.id,
        referrer: "http://localhost:3000/post/" + post.id,
      } satisfies ICommunityForumCommunityReport.ICreate,
    });
  typia.assert(report);

  // Step 6: Create a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "password123";
  const moderatorUsername =
    RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() + "_mod";

  // First create the moderator user
  const moderatorUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(moderatorUser);

  // Then make them a moderator
  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        community_forum_user_id: moderatorUser.id,
      } satisfies ICommunityForumCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 7: Create a moderation action
  const moderationAction: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: {
          action_type: "remove_content",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          details: RandomGenerator.paragraph({ sentences: 5 }),
          community_forum_report_id: report.id,
          community_forum_community_id: community.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies ICommunityForumCommunityModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 8: Login as moderator
  const moderatorLogin: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityForumCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // Step 9: Retrieve the moderation action details
  const retrievedAction: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.at(
      connection,
      {
        actionId: moderationAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Step 10: Validate that the retrieved action matches what we created
  TestValidator.equals(
    "retrieved moderation action ID should match created action ID",
    retrievedAction.id,
    moderationAction.id,
  );

  TestValidator.equals(
    "retrieved moderation action type should match",
    retrievedAction.action_type,
    "remove_content",
  );

  TestValidator.equals(
    "retrieved moderation action should have correct moderator ID",
    retrievedAction.community_forum_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "retrieved moderation action should have correct report ID",
    retrievedAction.community_forum_report_id,
    report.id,
  );

  TestValidator.equals(
    "retrieved moderation action should have correct community ID",
    retrievedAction.community_forum_community_id,
    community.id,
  );
}
