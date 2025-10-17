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
 * Tests pagination and sorting for moderation action search results.
 *
 * This test validates that the moderation action search API correctly handles
 * pagination parameters and returns consistent results across multiple pages.
 *
 * Test workflow:
 *
 * 1. Create moderator account
 * 2. Create community for moderation context
 * 3. Assign moderator to community
 * 4. Create member account to author content
 * 5. Create 40 posts to generate moderation actions
 * 6. Submit reports for posts
 * 7. Create 40 moderation actions with varying properties
 * 8. Test pagination with different page sizes
 * 9. Navigate through pages and verify consistency
 * 10. Test filtering with pagination
 */
export async function test_api_moderation_actions_pagination_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Assign moderator to community
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 4: Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create 40 posts
  const posts = await ArrayUtil.asyncRepeat(40, async (index) => {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: `Test Post ${index + 1} - ${RandomGenerator.name(3)}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 6: Submit reports for posts
  const reports = await ArrayUtil.asyncRepeat(40, async (index) => {
    const report = await api.functional.redditLike.content_reports.create(
      connection,
      {
        body: {
          reported_post_id: posts[index].id,
          community_id: community.id,
          content_type: "post",
          violation_categories: "spam,harassment",
          additional_context: `Report for post ${index + 1}`,
        } satisfies IRedditLikeContentReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Step 7: Create 40 moderation actions with varying properties
  const actionTypes = ["remove", "approve", "dismiss_report", "lock"] as const;
  const statuses = ["completed", "reversed"] as const;
  const reasonCategories = [
    "spam",
    "harassment",
    "misinformation",
    "other",
  ] as const;

  const actions = await ArrayUtil.asyncRepeat(40, async (index) => {
    const action =
      await api.functional.redditLike.moderator.moderation.actions.create(
        connection,
        {
          body: {
            report_id: reports[index].id,
            affected_post_id: posts[index].id,
            community_id: community.id,
            action_type: RandomGenerator.pick(actionTypes),
            content_type: "post",
            reason_category: RandomGenerator.pick(reasonCategories),
            reason_text: `Moderation action ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IRedditLikeModerationAction.ICreate,
        },
      );
    typia.assert(action);
    return action;
  });

  // Step 8: Test pagination with page size 5
  const page1Size5 =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(page1Size5);

  TestValidator.equals(
    "first page with limit 5 should have 5 records",
    page1Size5.data.length,
    5,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    page1Size5.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    page1Size5.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total records should be at least 40",
    page1Size5.pagination.records >= 40,
  );
  TestValidator.predicate(
    "total pages should be at least 8",
    page1Size5.pagination.pages >= 8,
  );

  // Step 9: Test page 2 with limit 5
  const page2Size5 =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(page2Size5);

  TestValidator.equals(
    "second page with limit 5 should have 5 records",
    page2Size5.data.length,
    5,
  );
  TestValidator.equals(
    "pagination current page should be 2",
    page2Size5.pagination.current,
    2,
  );

  // Verify no duplicate IDs between pages
  const page1Ids = page1Size5.data.map((a) => a.id);
  const page2Ids = page2Size5.data.map((a) => a.id);
  const hasNoDuplicates = page1Ids.every((id) => !page2Ids.includes(id));
  TestValidator.predicate(
    "pages should have no duplicate records",
    hasNoDuplicates,
  );

  // Step 10: Test pagination with page size 10
  const page1Size10 =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(page1Size10);

  TestValidator.equals(
    "first page with limit 10 should have 10 records",
    page1Size10.data.length,
    10,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    page1Size10.pagination.limit,
    10,
  );

  // Step 11: Test pagination with page size 20
  const page1Size20 =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(page1Size20);

  TestValidator.equals(
    "first page with limit 20 should have 20 records",
    page1Size20.data.length,
    20,
  );

  // Step 12: Navigate to page 3 with limit 10
  const page3Size10 =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(page3Size10);

  TestValidator.equals(
    "third page current should be 3",
    page3Size10.pagination.current,
    3,
  );
  TestValidator.predicate(
    "third page should have records",
    page3Size10.data.length > 0,
  );

  // Step 13: Test filtering by community_id with pagination
  const filteredByCommunity =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          community_id: community.id,
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(filteredByCommunity);

  TestValidator.predicate(
    "filtered results should have records",
    filteredByCommunity.data.length > 0,
  );

  // Step 14: Test filtering by action_type with pagination
  const filteredByActionType =
    await api.functional.redditLike.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          action_type: "remove",
        } satisfies IRedditLikeModerationAction.IRequest,
      },
    );
  typia.assert(filteredByActionType);

  // Step 15: Verify page calculation accuracy
  const totalRecords = page1Size5.pagination.records;
  const limit = 5;
  const expectedPages = Math.ceil(totalRecords / limit);
  TestValidator.equals(
    "calculated pages should match pagination pages",
    page1Size5.pagination.pages,
    expectedPages,
  );
}
