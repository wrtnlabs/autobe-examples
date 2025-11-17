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

export async function test_api_moderation_action_delete_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create community creator user
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = "password123";
  const creatorUsername = RandomGenerator.name(1);
  const creator = await api.functional.auth.user.join(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      username: creatorUsername,
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(creator);

  // Step 2: Create community
  const communityName = RandomGenerator.name(2)
    .replace(/\s+/g, "-")
    .toLowerCase();
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: communityName,
        slug: communityName,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post creator user
  const postCreatorEmail = typia.random<string & tags.Format<"email">>();
  const postCreatorPassword = "password123";
  const postCreatorUsername = RandomGenerator.name(1);
  const postCreator = await api.functional.auth.user.join(connection, {
    body: {
      email: postCreatorEmail,
      password: postCreatorPassword,
      username: postCreatorUsername,
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(postCreator);

  // Step 4: Create post
  const post = await api.functional.communityForum.user.posts.create(
    connection,
    {
      body: {
        community_forum_community_id: community.id,
        title: RandomGenerator.name(5),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies ICommunityForumCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create reporter user
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = "password123";
  const reporterUsername = RandomGenerator.name(1);
  const reporter = await api.functional.auth.user.join(connection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
      username: reporterUsername,
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(reporter);

  // Step 6: Create report
  const report = await api.functional.communityForum.user.reports.create(
    connection,
    {
      body: {
        actor_type: "post",
        reason: "spam",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        community_forum_post_id: post.id,
        href: "http://localhost:3000/report",
        referrer: "http://localhost:3000/post",
      } satisfies ICommunityForumCommunityReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Create moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "password123";
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorUser = await api.functional.auth.user.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(moderatorUser);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      community_forum_user_id: moderatorUser.id,
    } satisfies ICommunityForumCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 8: Create moderation action
  const moderationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: {
          action_type: "remove_content",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          details: RandomGenerator.paragraph({ sentences: 3 }),
          community_forum_report_id: report.id,
          community_forum_community_id: community.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies ICommunityForumCommunityModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 9: Create administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const adminUsername = RandomGenerator.name(1);
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(adminUser);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      community_forum_user_id: adminUser.id,
      role: "system_admin",
    } satisfies ICommunityForumCommunityAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 10: Login as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/login",
    } satisfies ICommunityForumCommunityAdministrator.ILogin,
  });

  // Step 11: Delete moderation action
  await api.functional.communityForum.administrator.moderation_actions.erase(
    connection,
    {
      actionId: moderationAction.id,
    },
  );

  // Step 12: Verify deletion by attempting to access the deleted action
  // This should throw an error since the action was deleted
  await TestValidator.error("moderation action should be deleted", async () => {
    // There's no API to get a single moderation action, so we'll try to delete it again
    // which should fail since it no longer exists
    await api.functional.communityForum.administrator.moderation_actions.erase(
      connection,
      {
        actionId: moderationAction.id,
      },
    );
  });
}
