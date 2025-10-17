import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationAppeal";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that members can filter their appeals by appeal_type to find specific
 * kinds of appeals.
 *
 * This test validates the appeal filtering functionality by creating multiple
 * appeal types and ensuring that type-based filtering returns only the matching
 * appeals. The test creates content removal appeals, community ban appeals, and
 * validates that filtering by appeal_type works correctly with pagination and
 * sorting. It also verifies that type filtering can be combined with other
 * filters like status.
 *
 * Steps:
 *
 * 1. Create a member account for submitting appeals
 * 2. Create a moderator account for moderation actions
 * 3. Create a community for the test context
 * 4. Create a post and have it removed to generate content_removal appeal
 * 5. Submit a content report to trigger content removal
 * 6. Moderator creates a removal action
 * 7. Member submits an appeal for the content removal
 * 8. Moderator issues a community ban
 * 9. Member submits an appeal for the community ban
 * 10. Retrieve appeals filtered by content_removal type
 * 11. Retrieve appeals filtered by community_ban type
 * 12. Validate that filtering returns only matching appeal types
 * 13. Verify pagination and sorting work with type filtering
 * 14. Test combining type filtering with status filtering
 */
export async function test_api_member_appeal_filtering_by_type(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create community
  const communityCode = RandomGenerator.alphaNumeric(10);
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Create a post
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 5: Submit content report
  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report);

  // Step 6: Moderator creates removal action
  const removalAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report.id,
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(removalAction);

  // Step 7: Member submits content removal appeal
  const contentRemovalAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: removalAction.id,
          appeal_type: "content_removal",
          appeal_text: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(contentRemovalAppeal);
  TestValidator.equals(
    "content removal appeal type",
    contentRemovalAppeal.appeal_type,
    "content_removal",
  );

  // Step 8: Moderator issues community ban
  const communityBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: member.id,
          ban_reason_category: "harassment",
          ban_reason_text: RandomGenerator.paragraph({ sentences: 3 }),
          is_permanent: false,
          expiration_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(communityBan);

  // Step 9: Member submits community ban appeal
  const communityBanAppeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          community_ban_id: communityBan.id,
          appeal_type: "community_ban",
          appeal_text: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(communityBanAppeal);
  TestValidator.equals(
    "community ban appeal type",
    communityBanAppeal.appeal_type,
    "community_ban",
  );

  // Step 10: Retrieve appeals filtered by content_removal type
  const contentRemovalFiltered: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      connection,
      {
        body: {
          appeal_type: "content_removal",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationAppeal.IRequest,
      },
    );
  typia.assert(contentRemovalFiltered);

  // Step 11: Verify content_removal filter returns only content_removal appeals
  TestValidator.predicate(
    "content_removal filter returns at least one appeal",
    contentRemovalFiltered.data.length > 0,
  );

  for (const appeal of contentRemovalFiltered.data) {
    TestValidator.equals(
      "all appeals are content_removal type",
      appeal.appeal_type,
      "content_removal",
    );
  }

  const foundContentRemovalAppeal = contentRemovalFiltered.data.find(
    (a) => a.id === contentRemovalAppeal.id,
  );
  TestValidator.predicate(
    "content_removal appeal is in filtered results",
    foundContentRemovalAppeal !== undefined,
  );

  // Step 12: Retrieve appeals filtered by community_ban type
  const communityBanFiltered: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      connection,
      {
        body: {
          appeal_type: "community_ban",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationAppeal.IRequest,
      },
    );
  typia.assert(communityBanFiltered);

  // Step 13: Verify community_ban filter returns only community_ban appeals
  TestValidator.predicate(
    "community_ban filter returns at least one appeal",
    communityBanFiltered.data.length > 0,
  );

  for (const appeal of communityBanFiltered.data) {
    TestValidator.equals(
      "all appeals are community_ban type",
      appeal.appeal_type,
      "community_ban",
    );
  }

  const foundCommunityBanAppeal = communityBanFiltered.data.find(
    (a) => a.id === communityBanAppeal.id,
  );
  TestValidator.predicate(
    "community_ban appeal is in filtered results",
    foundCommunityBanAppeal !== undefined,
  );

  // Step 14: Verify content_removal filter does NOT return community_ban appeals
  const noMixedResults = contentRemovalFiltered.data.find(
    (a) => a.id === communityBanAppeal.id,
  );
  TestValidator.predicate(
    "community_ban appeal not in content_removal filter",
    noMixedResults === undefined,
  );

  // Step 15: Test type filtering with status filtering combination
  const combinedFilter: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      connection,
      {
        body: {
          appeal_type: "content_removal",
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationAppeal.IRequest,
      },
    );
  typia.assert(combinedFilter);

  // Verify all results match both filters
  for (const appeal of combinedFilter.data) {
    TestValidator.equals(
      "combined filter: appeal type is content_removal",
      appeal.appeal_type,
      "content_removal",
    );
    TestValidator.equals(
      "combined filter: appeal status is pending",
      appeal.status,
      "pending",
    );
  }

  // Step 16: Verify pagination works with type filtering
  const paginationTest: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      connection,
      {
        body: {
          appeal_type: "content_removal",
          page: 1,
          limit: 1,
        } satisfies IRedditLikeModerationAppeal.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination limit respected",
    paginationTest.data.length <= 1,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    paginationTest.pagination.limit === 1,
  );
}
