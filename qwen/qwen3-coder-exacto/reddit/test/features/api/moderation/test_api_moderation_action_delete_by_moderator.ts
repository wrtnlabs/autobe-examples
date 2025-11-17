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

export async function test_api_moderation_action_delete_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name:
      RandomGenerator.name(2).replace(/\s/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    slug:
      RandomGenerator.name(1).replace(/\s/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphabets(5),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(4),
    type: "text",
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // Step 5: Report the comment
  const reportCreate = {
    actor_type: "comment",
    reason: "harassment",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    community_forum_comment_id: comment.id,
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumCommunityReport.ICreate;

  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: reportCreate,
    });
  typia.assert(report);

  // Step 6: Create a moderator
  const moderatorJoin = {
    email: `${RandomGenerator.alphabets(10)}@moderator.com`,
    password: "moderator123",
    username:
      "mod_" +
      RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const moderatorUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: moderatorJoin,
    });
  typia.assert(moderatorUser);

  // Assign moderator role
  const moderatorCreate = {
    community_forum_user_id: moderatorUser.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 7: Login as moderator
  const moderatorLogin = {
    email: moderatorJoin.email,
    password: moderatorJoin.password,
    href: "http://localhost/login",
    referrer: "http://localhost/home",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  await api.functional.auth.moderator.login(connection, {
    body: moderatorLogin,
  });

  // Step 8: Create a moderation action
  const moderationActionCreate = {
    action_type: "remove_content",
    reason: "Harassment violation",
    details:
      "Comment contained harassment content and was removed per community guidelines",
    community_forum_report_id: report.id,
    community_forum_community_id: community.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies ICommunityForumCommunityModerationAction.ICreate;

  const moderationAction: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: moderationActionCreate,
      },
    );
  typia.assert(moderationAction);

  // Step 9: Delete the moderation action
  await api.functional.communityForum.moderator.moderation_actions.erase(
    connection,
    {
      actionId: moderationAction.id,
    },
  );

  // Step 10: Verify deletion by attempting to create another action with same data but expect different ID
  // This confirms the original action was deleted
  const moderationAction2: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: moderationActionCreate,
      },
    );
  typia.assert(moderationAction2);

  TestValidator.notEquals(
    "deleted action should not be same as new action",
    moderationAction.id,
    moderationAction2.id,
  );
}
