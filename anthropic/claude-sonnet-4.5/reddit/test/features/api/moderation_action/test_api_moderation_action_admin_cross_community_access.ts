import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_moderation_action_admin_cross_community_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with platform-wide access
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create moderator account - need fresh connection to avoid token conflicts
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 3: Create member account - need fresh connection
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(memberConnection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a community
  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 5: Member creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Member submits a content report for the post
  const report = await api.functional.redditLike.content_reports.create(
    memberConnection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Moderator takes moderation action in the community
  const action = await api.functional.redditLike.moderation.actions.create(
    moderatorConnection,
    {
      body: {
        report_id: report.id,
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    },
  );
  typia.assert(action);

  // Step 8: Administrator retrieves the moderation action from community they don't moderate
  // The admin connection still has the admin authentication from step 1
  const retrievedAction =
    await api.functional.redditLike.admin.moderation.actions.at(connection, {
      actionId: action.id,
    });
  typia.assert(retrievedAction);

  // Step 9: Validate that administrator successfully retrieved the action
  TestValidator.equals(
    "retrieved action ID matches created action",
    retrievedAction.id,
    action.id,
  );
  TestValidator.equals(
    "retrieved action type matches",
    retrievedAction.action_type,
    action.action_type,
  );
  TestValidator.equals(
    "retrieved action content type matches",
    retrievedAction.content_type,
    action.content_type,
  );
}
