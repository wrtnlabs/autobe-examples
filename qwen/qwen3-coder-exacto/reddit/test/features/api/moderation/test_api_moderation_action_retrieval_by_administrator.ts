import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

export async function test_api_moderation_action_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
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
    title: RandomGenerator.name(3),
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
    ip: null,
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
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
    ip: null,
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityReport.ICreate;

  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: reportCreate,
    });
  typia.assert(report);

  // Step 6: Create a moderator
  const moderatorCreate = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 7: Create a moderation action
  const actionCreate = {
    action_type: "remove_content",
    reason: "Harassment violation",
    details: "Comment contained harassing language toward other users",
    community_forum_report_id: report.id,
    community_forum_community_id: community.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies ICommunityForumCommunityModerationAction.ICreate;

  const action: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: actionCreate,
      },
    );
  typia.assert(action);

  // Step 8: Create an administrator
  const adminCreate = {
    community_forum_user_id: user.id,
    role: "system_admin",
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin: ICommunityForumCommunityAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Step 9: Retrieve the moderation action as administrator
  const retrievedAction: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.administrator.moderation_actions.at(
      connection,
      {
        actionId: action.id,
      },
    );
  typia.assert(retrievedAction);

  // Validate that the retrieved action matches the created action
  TestValidator.equals(
    "retrieved moderation action should match created action",
    retrievedAction.id,
    action.id,
  );
  TestValidator.equals(
    "action type should match",
    retrievedAction.action_type,
    action.action_type,
  );
  TestValidator.equals(
    "reason should match",
    retrievedAction.reason,
    action.reason,
  );
  TestValidator.equals(
    "community ID should match",
    retrievedAction.community_forum_community_id,
    action.community_forum_community_id,
  );
}
