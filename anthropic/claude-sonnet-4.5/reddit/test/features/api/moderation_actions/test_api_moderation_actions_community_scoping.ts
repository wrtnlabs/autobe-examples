import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationAction";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that moderators can only search moderation actions for communities they
 * moderate, validating proper access control and data scoping.
 *
 * This test creates multiple communities with different moderators, generates
 * moderation actions in each community, and verifies that moderators only
 * receive results from their assigned communities when searching for actions.
 *
 * **Workflow:**
 *
 * 1. Create Moderator A and Community A with member, assign moderator
 * 2. Create Moderator B and Community B with member, assign moderator
 * 3. Create member accounts and posts in both communities
 * 4. Submit reports and create moderation actions in both communities
 * 5. Verify Moderator A can only see Community A actions
 * 6. Verify Moderator B can only see Community B actions
 * 7. Test community ID filtering respects moderator permissions
 */
export async function test_api_moderation_actions_community_scoping(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account (Moderator A)
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAPassword = RandomGenerator.alphaNumeric(12);
  const moderatorA = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorAEmail,
      password: moderatorAPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderatorA);

  // Step 2: Create Community A as member (creator becomes primary moderator)
  const memberForCommunityAEmail = typia.random<
    string & tags.Format<"email">
  >();
  const memberForCommunityAPassword = RandomGenerator.alphaNumeric(12);
  const memberForCommunityA = await api.functional.auth.member.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberForCommunityAEmail,
        password: memberForCommunityAPassword,
      } satisfies IRedditLikeMember.ICreate,
    },
  );
  typia.assert(memberForCommunityA);

  const communityA = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityA);

  // Step 3: Assign Moderator A to Community A (switch to moderator A auth)
  connection.headers = {
    ...connection.headers,
    Authorization: moderatorA.token.access,
  };

  const moderatorAAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: communityA.id,
        body: {
          moderator_id: moderatorA.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAAssignment);

  // Step 4: Create second moderator account (Moderator B)
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();
  const moderatorBPassword = RandomGenerator.alphaNumeric(12);
  const moderatorB = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorBEmail,
      password: moderatorBPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderatorB);

  // Step 5: Create Community B as member
  const memberForCommunityBEmail = typia.random<
    string & tags.Format<"email">
  >();
  const memberForCommunityBPassword = RandomGenerator.alphaNumeric(12);
  const memberForCommunityB = await api.functional.auth.member.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberForCommunityBEmail,
        password: memberForCommunityBPassword,
      } satisfies IRedditLikeMember.ICreate,
    },
  );
  typia.assert(memberForCommunityB);

  const communityB = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: false,
        allow_image_posts: false,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityB);

  // Step 6: Assign Moderator B to Community B (switch to moderator B auth)
  connection.headers = {
    ...connection.headers,
    Authorization: moderatorB.token.access,
  };

  const moderatorBAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: communityB.id,
        body: {
          moderator_id: moderatorB.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorBAssignment);

  // Step 7: Create member account for posting content
  const contentMemberEmail = typia.random<string & tags.Format<"email">>();
  const contentMemberPassword = RandomGenerator.alphaNumeric(12);
  const contentMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: contentMemberEmail,
      password: contentMemberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(contentMember);

  // Step 8: Create posts in both communities
  const postInCommunityA = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: communityA.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(postInCommunityA);

  const postInCommunityB = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: communityB.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(postInCommunityB);

  // Step 9: Submit content reports for both posts
  const reportInCommunityA =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: postInCommunityA.id,
        community_id: communityA.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(reportInCommunityA);

  const reportInCommunityB =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: postInCommunityB.id,
        community_id: communityB.id,
        content_type: "post",
        violation_categories: "hate_speech",
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(reportInCommunityB);

  // Step 10: Create moderation actions in Community A (as Moderator A)
  connection.headers = {
    ...connection.headers,
    Authorization: moderatorA.token.access,
  };

  const actionInCommunityA =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          report_id: reportInCommunityA.id,
          affected_post_id: postInCommunityA.id,
          community_id: communityA.id,
          action_type: "remove",
          content_type: "post",
          removal_type: "community",
          reason_category: "spam",
          reason_text: RandomGenerator.paragraph({ sentences: 2 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(actionInCommunityA);

  // Step 11: Create moderation actions in Community B (as Moderator B)
  connection.headers = {
    ...connection.headers,
    Authorization: moderatorB.token.access,
  };

  const actionInCommunityB =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          report_id: reportInCommunityB.id,
          affected_post_id: postInCommunityB.id,
          community_id: communityB.id,
          action_type: "remove",
          content_type: "post",
          removal_type: "platform",
          reason_category: "hate_speech",
          reason_text: RandomGenerator.paragraph({ sentences: 2 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(actionInCommunityB);

  // Step 12: Test Moderator A access control - should only see Community A actions
  connection.headers = {
    ...connection.headers,
    Authorization: moderatorA.token.access,
  };

  const moderatorAResults =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(moderatorAResults);

  // Verify Moderator A only sees actions from Community A
  TestValidator.predicate(
    "Moderator A should have at least one action",
    moderatorAResults.data.length > 0,
  );

  // Step 13: Test Moderator B access control - should only see Community B actions
  connection.headers = {
    ...connection.headers,
    Authorization: moderatorB.token.access,
  };

  const moderatorBResults =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(moderatorBResults);

  // Verify Moderator B only sees actions from Community B
  TestValidator.predicate(
    "Moderator B should have at least one action",
    moderatorBResults.data.length > 0,
  );

  // Step 14: Test community-specific filtering for Moderator A
  connection.headers = {
    ...connection.headers,
    Authorization: moderatorA.token.access,
  };

  const moderatorAFilteredByCommunityA =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          community_id: communityA.id,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(moderatorAFilteredByCommunityA);

  TestValidator.predicate(
    "Moderator A filtering by Community A should return results",
    moderatorAFilteredByCommunityA.data.length > 0,
  );

  // Attempt to filter by Community B (should return empty or only permitted communities)
  const moderatorAFilteredByCommunityB =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          community_id: communityB.id,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(moderatorAFilteredByCommunityB);

  TestValidator.predicate(
    "Moderator A filtering by Community B should return no results",
    moderatorAFilteredByCommunityB.data.length === 0,
  );

  // Step 15: Validate that Moderator B cannot see Community A actions
  connection.headers = {
    ...connection.headers,
    Authorization: moderatorB.token.access,
  };

  const moderatorBFilteredByCommunityA =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          community_id: communityA.id,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(moderatorBFilteredByCommunityA);

  TestValidator.predicate(
    "Moderator B filtering by Community A should return no results",
    moderatorBFilteredByCommunityA.data.length === 0,
  );
}
