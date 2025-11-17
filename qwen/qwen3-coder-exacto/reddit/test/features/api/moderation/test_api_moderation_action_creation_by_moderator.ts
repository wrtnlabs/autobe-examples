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

export async function test_api_moderation_action_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";
  const userUsername = RandomGenerator.name(1);

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        username: userUsername,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(user);

  // Step 2: Create a moderator (using the same user)
  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        community_forum_user_id: user.id,
      } satisfies ICommunityForumCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Login as the moderator
  const moderatorLogin: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/login",
      } satisfies ICommunityForumCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // Step 4: Create a community
  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    });
  typia.assert(community);

  // Step 5: Create a post in the community (as the user)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/login",
    } satisfies ICommunityForumCommunityUser.ILogin,
  });

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: {
        community_forum_community_id: community.id,
        title: RandomGenerator.name(4),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies ICommunityForumCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Report the post (as the user)
  const report: ICommunityForumCommunityReport =
    await api.functional.communityForum.user.reports.create(connection, {
      body: {
        actor_type: "post",
        reason: "spam",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        community_forum_post_id: post.id,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/post/" + post.id,
      } satisfies ICommunityForumCommunityReport.ICreate,
    });
  typia.assert(report);

  // Step 7: Login as moderator again
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/login",
    } satisfies ICommunityForumCommunityModerator.ILogin,
  });

  // Step 8: Create a moderation action for the report
  const moderationAction: ICommunityForumCommunityModerationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: {
          action_type: "remove_content",
          reason: "Post violates community guidelines on spam content",
          details:
            "User reported post as spam. Content contains multiple promotional links and repetitive text.",
          community_forum_report_id: report.id,
          community_forum_community_id: community.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies ICommunityForumCommunityModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Validate the created moderation action
  TestValidator.equals(
    "moderation action created with correct report ID",
    moderationAction.community_forum_report_id,
    report.id,
  );
  TestValidator.equals(
    "moderation action created with correct community ID",
    moderationAction.community_forum_community_id,
    community.id,
  );
  TestValidator.equals(
    "moderation action has correct action type",
    moderationAction.action_type,
    "remove_content",
  );
  TestValidator.equals(
    "moderation action has correct reason",
    moderationAction.reason,
    "Post violates community guidelines on spam content",
  );
}
