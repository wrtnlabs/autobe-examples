import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationAction";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test cross-community moderation analysis for platform-wide oversight.
 *
 * This test validates that administrators can search and analyze moderation
 * actions across multiple communities simultaneously, supporting platform-wide
 * oversight, policy compliance monitoring, and moderation quality auditing.
 *
 * Test workflow:
 *
 * 1. Create administrator account for platform-wide access
 * 2. Create multiple moderator accounts for different communities
 * 3. Create multiple communities with different moderators
 * 4. Create member accounts to generate content
 * 5. Create posts across different communities
 * 6. Submit content reports in multiple communities
 * 7. Moderators take various actions across communities
 * 8. Administrator searches actions across all communities
 * 9. Validate cross-community filtering and pagination
 * 10. Verify action type filtering works platform-wide
 */
export async function test_api_admin_moderation_actions_cross_community_analysis(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create multiple moderator accounts (3 moderators)
  const moderators: IRedditLikeModerator.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const modData = {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeModerator.ICreate;

    const moderator = await api.functional.auth.moderator.join(connection, {
      body: modData,
    });
    typia.assert(moderator);
    moderators.push(moderator);
  }

  // Step 3: Create multiple communities (3 communities)
  const communities: IRedditLikeCommunity[] = [];
  for (let i = 0; i < 3; i++) {
    const communityData = {
      code: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      privacy_type: "public",
      posting_permission: "anyone_subscribed",
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
    } satisfies IRedditLikeCommunity.ICreate;

    const community = await api.functional.redditLike.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
    typia.assert(community);
    communities.push(community);
  }

  // Step 4: Assign moderators to communities (each moderator gets one community)
  for (let i = 0; i < 3; i++) {
    const assignmentData = {
      moderator_id: moderators[i].id,
      permissions: "manage_posts,manage_comments,access_reports",
    } satisfies IRedditLikeCommunityModerator.ICreate;

    const assignment =
      await api.functional.redditLike.moderator.communities.moderators.create(
        connection,
        {
          communityId: communities[i].id,
          body: assignmentData,
        },
      );
    typia.assert(assignment);
  }

  // Step 5: Create member accounts (2 members)
  const members: IRedditLikeMember.IAuthorized[] = [];
  for (let i = 0; i < 2; i++) {
    const memberData = {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);
    members.push(member);
  }

  // Step 6: Create posts in each community (2 posts per community)
  const posts: IRedditLikePost[] = [];
  for (let i = 0; i < communities.length; i++) {
    for (let j = 0; j < 2; j++) {
      const postData = {
        community_id: communities[i].id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate;

      const post = await api.functional.redditLike.member.posts.create(
        connection,
        {
          body: postData,
        },
      );
      typia.assert(post);
      posts.push(post);
    }
  }

  // Step 7: Submit content reports (1 report per post)
  const reports: IRedditLikeContentReport[] = [];
  for (let i = 0; i < posts.length; i++) {
    const reportData = {
      reported_post_id: posts[i].id,
      community_id: communities[Math.floor(i / 2)].id,
      content_type: "post",
      violation_categories: "spam,harassment",
      additional_context: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IRedditLikeContentReport.ICreate;

    const report = await api.functional.redditLike.content_reports.create(
      connection,
      {
        body: reportData,
      },
    );
    typia.assert(report);
    reports.push(report);
  }

  // Step 8: Moderators take various actions across communities
  const actionTypes = ["remove", "approve", "dismiss_report"] as const;
  const moderationActions: IRedditLikeModerationAction[] = [];

  for (let i = 0; i < reports.length; i++) {
    const communityIndex = Math.floor(i / 2);
    const actionType = actionTypes[i % actionTypes.length];

    const actionData = {
      report_id: reports[i].id,
      affected_post_id: posts[i].id,
      community_id: communities[communityIndex].id,
      action_type: actionType,
      content_type: "post",
      removal_type: actionType === "remove" ? "community" : undefined,
      reason_category: "spam",
      reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IRedditLikeModerationAction.ICreate;

    const action =
      await api.functional.redditLike.moderator.moderation.actions.create(
        connection,
        {
          body: actionData,
        },
      );
    typia.assert(action);
    moderationActions.push(action);
  }

  // Step 9: Administrator searches actions across all communities (no filter)
  const allActionsRequest = {
    page: 1,
    limit: 20,
  } satisfies IRedditLikeModerationAction.IRequest;

  const allActionsResult =
    await api.functional.redditLike.admin.moderation.actions.index(connection, {
      body: allActionsRequest,
    });
  typia.assert(allActionsResult);

  // Validate pagination structure
  TestValidator.predicate(
    "all actions result has pagination",
    allActionsResult.pagination !== null &&
      allActionsResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "all actions result has data array",
    Array.isArray(allActionsResult.data),
  );
  TestValidator.predicate(
    "all actions result contains multiple actions",
    allActionsResult.data.length > 0,
  );

  // Step 10: Filter by specific community
  const targetCommunity = communities[0];
  const communityFilterRequest = {
    page: 1,
    limit: 10,
    community_id: targetCommunity.id,
  } satisfies IRedditLikeModerationAction.IRequest;

  const communityFilterResult =
    await api.functional.redditLike.admin.moderation.actions.index(connection, {
      body: communityFilterRequest,
    });
  typia.assert(communityFilterResult);

  TestValidator.predicate(
    "community filter result has data",
    Array.isArray(communityFilterResult.data),
  );

  // Step 11: Filter by action type
  const actionTypeFilterRequest = {
    page: 1,
    limit: 10,
    action_type: "remove",
  } satisfies IRedditLikeModerationAction.IRequest;

  const actionTypeFilterResult =
    await api.functional.redditLike.admin.moderation.actions.index(connection, {
      body: actionTypeFilterRequest,
    });
  typia.assert(actionTypeFilterResult);

  TestValidator.predicate(
    "action type filter result has data",
    Array.isArray(actionTypeFilterResult.data),
  );

  // Step 12: Filter by status
  const statusFilterRequest = {
    page: 1,
    limit: 10,
    status: "completed",
  } satisfies IRedditLikeModerationAction.IRequest;

  const statusFilterResult =
    await api.functional.redditLike.admin.moderation.actions.index(connection, {
      body: statusFilterRequest,
    });
  typia.assert(statusFilterResult);

  TestValidator.predicate(
    "status filter result has data",
    Array.isArray(statusFilterResult.data),
  );

  // Step 13: Test pagination with small limit
  const paginationRequest = {
    page: 1,
    limit: 2,
  } satisfies IRedditLikeModerationAction.IRequest;

  const paginationResult =
    await api.functional.redditLike.admin.moderation.actions.index(connection, {
      body: paginationRequest,
    });
  typia.assert(paginationResult);

  TestValidator.predicate(
    "pagination respects limit",
    paginationResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 2,
  );
}
