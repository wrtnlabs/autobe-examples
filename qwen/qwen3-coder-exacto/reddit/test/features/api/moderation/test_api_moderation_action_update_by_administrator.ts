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

export async function test_api_moderation_action_update_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for community creator
  const creatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const creator = await api.functional.auth.user.join(connection, {
    body: creatorJoinBody,
  });
  typia.assert(creator);

  // Step 2: Create a community using the creator account
  const communityBody = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    slug:
      RandomGenerator.name(1).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    rules: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: communityBody,
    },
  );
  typia.assert(community);

  // Step 3: Create a user account for post creator
  const postCreatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const postCreator = await api.functional.auth.user.join(connection, {
    body: postCreatorJoinBody,
  });
  typia.assert(postCreator);

  // Step 4: Create a post in the community
  const postBody = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    type: "text",
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 15,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post = await api.functional.communityForum.user.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // Step 5: Create a user account for reporter
  const reporterJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const reporter = await api.functional.auth.user.join(connection, {
    body: reporterJoinBody,
  });
  typia.assert(reporter);

  // Step 6: Create a report for the post
  const reportBody = {
    actor_type: "post",
    reason: RandomGenerator.pick([
      "spam",
      "harassment",
      "misinformation",
      "copyright",
      "violence",
      "hate_speech",
      "other",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    community_forum_post_id: post.id,
    href: "http://localhost:3000/report",
    referrer: "http://localhost:3000/post",
  } satisfies ICommunityForumCommunityReport.ICreate;

  const report = await api.functional.communityForum.user.reports.create(
    connection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);

  // Step 7: Create a moderator account
  const moderatorJoinBody = {
    community_forum_user_id: creator.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderator);

  // Step 8: Create a moderation action by the moderator
  const moderationActionBody = {
    action_type: RandomGenerator.pick([
      "remove_content",
      "warn_user",
      "restrict_user",
      "ban_user",
      "approve_report",
      "dismiss_report",
    ] as const),
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    community_forum_report_id: report.id,
    community_forum_community_id: community.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies ICommunityForumCommunityModerationAction.ICreate;

  const moderationAction =
    await api.functional.communityForum.moderator.moderation_actions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // Step 9: Create an administrator account
  const adminJoinBody = {
    community_forum_user_id: postCreator.id,
    role: "system_admin",
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // Step 10: Update the moderation action as administrator
  const updateBody = {
    action_type: RandomGenerator.pick([
      "remove_content",
      "warn_user",
      "restrict_user",
      "ban_user",
      "approve_report",
      "dismiss_report",
    ] as const),
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    details: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    community_forum_report_id: report.id,
    community_forum_community_id: community.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies ICommunityForumCommunityModerationAction.IUpdate;

  const updatedAction =
    await api.functional.communityForum.administrator.moderation_actions.update(
      connection,
      {
        actionId: moderationAction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAction);

  // Validate that the moderation action was updated correctly
  TestValidator.equals(
    "moderation action updated correctly",
    updatedAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "moderation action reason updated",
    updatedAction.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "moderation action details updated",
    updatedAction.details,
    updateBody.details,
  );
}
