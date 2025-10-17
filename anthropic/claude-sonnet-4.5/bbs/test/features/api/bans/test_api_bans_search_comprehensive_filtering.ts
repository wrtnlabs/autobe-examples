import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";

/**
 * Test comprehensive ban search functionality for administrators.
 *
 * This scenario validates that administrators can search and filter permanent
 * account bans using multiple criteria including date ranges, issuing
 * administrator, appealability status, reversal status, and text search across
 * ban reasons and violation summaries.
 *
 * Test workflow:
 *
 * 1. Create administrator account and authenticate
 * 2. Create categories for topics (prerequisite for member activity)
 * 3. Create topics by members to establish violation context
 * 4. Create moderation actions documenting violations
 * 5. Create multiple permanent bans with different characteristics
 * 6. Execute ban search with various filter combinations
 * 7. Validate search results match filter criteria
 * 8. Verify pagination and sorting functionality
 */
export async function test_api_bans_search_comprehensive_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create categories for topics
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create topics to establish member accounts and violation context
  const topics = await ArrayUtil.asyncRepeat(5, async () => {
    return await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          category_id: category.id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
  });
  topics.forEach((topic) => typia.assert(topic));

  // Step 4: Create moderation actions documenting violations
  const moderationActions = await ArrayUtil.asyncRepeat(5, async (index) => {
    const topic = topics[index];
    return await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: {
          administrator_id: admin.id,
          target_member_id: topic.author.id,
          content_topic_id: topic.id,
          action_type: "hide_content",
          reason: RandomGenerator.content({ paragraphs: 1 }),
          violation_category: RandomGenerator.pick([
            "hate_speech",
            "spam",
            "personal_attack",
            "misinformation",
            "trolling",
          ] as const),
          content_snapshot: topic.body,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  });
  moderationActions.forEach((action) => typia.assert(action));

  // Step 5: Create multiple permanent bans with different characteristics
  const bans = await ArrayUtil.asyncRepeat(5, async (index) => {
    const isAppealable = index % 2 === 0;
    const banReason = `Ban reason ${index}: ${RandomGenerator.paragraph({ sentences: 10 })}`;
    const violationSummary = `Violation summary for ban ${index}: ${RandomGenerator.content({ paragraphs: 2 })}`;

    return await api.functional.discussionBoard.administrator.bans.create(
      connection,
      {
        body: {
          member_id: topics[index].author.id,
          moderation_action_id: moderationActions[index].id,
          ban_reason: banReason,
          violation_summary: violationSummary,
          is_appealable: isAppealable,
          appeal_window_days: isAppealable ? 30 : null,
          ip_address_banned: `192.168.1.${index}`,
          email_banned: typia.random<string & tags.Format<"email">>(),
        } satisfies IDiscussionBoardBan.ICreate,
      },
    );
  });
  bans.forEach((ban) => typia.assert(ban));

  // Step 6: Execute comprehensive ban search with various filters

  // Test 1: Basic search without filters
  const allBans = await api.functional.discussionBoard.administrator.bans.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(allBans);
  TestValidator.predicate("all bans retrieved", allBans.data.length >= 5);
  TestValidator.predicate(
    "pagination records match",
    allBans.pagination.records >= 5,
  );

  // Test 2: Filter by administrator
  const adminBans =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        administrator_id: admin.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(adminBans);
  TestValidator.predicate("admin filter works", adminBans.data.length >= 5);
  adminBans.data.forEach((ban) => {
    TestValidator.equals("ban issued by admin", ban.administrator_id, admin.id);
  });

  // Test 3: Filter by appealability status
  const appealableBans =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        is_appealable: true,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(appealableBans);
  appealableBans.data.forEach((ban) => {
    TestValidator.equals("ban is appealable", ban.is_appealable, true);
  });

  const nonAppealableBans =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        is_appealable: false,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(nonAppealableBans);
  nonAppealableBans.data.forEach((ban) => {
    TestValidator.equals("ban is not appealable", ban.is_appealable, false);
  });

  // Test 4: Filter by reversal status
  const reversedBans =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        is_reversed: false,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(reversedBans);
  reversedBans.data.forEach((ban) => {
    TestValidator.equals("ban is not reversed", ban.is_reversed, false);
  });

  // Test 5: Text search in ban reasons
  const searchTerm = "reason";
  const searchResults =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(searchResults);
  TestValidator.predicate(
    "search finds matching bans",
    searchResults.data.length > 0,
  );

  // Test 6: Date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24);

  const dateRangeBans =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        created_from: pastDate.toISOString(),
        created_to: futureDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(dateRangeBans);
  TestValidator.predicate(
    "date range filter works",
    dateRangeBans.data.length >= 5,
  );

  // Test 7: Test pagination
  const page1 = await api.functional.discussionBoard.administrator.bans.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate("page 1 has correct limit", page1.data.length <= 2);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);

  // Test 8: Test sorting - ascending by created_at
  const sortedAsc =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        sort: "created_at",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(sortedAsc);

  // Test 9: Test sorting - descending by created_at
  const sortedDesc =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        sort: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(sortedDesc);

  // Test 10: Combined filters
  const combinedFilter =
    await api.functional.discussionBoard.administrator.bans.index(connection, {
      body: {
        administrator_id: admin.id,
        is_appealable: true,
        is_reversed: false,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(combinedFilter);
  combinedFilter.data.forEach((ban) => {
    TestValidator.equals(
      "combined filter - admin",
      ban.administrator_id,
      admin.id,
    );
    TestValidator.equals(
      "combined filter - appealable",
      ban.is_appealable,
      true,
    );
    TestValidator.equals(
      "combined filter - not reversed",
      ban.is_reversed,
      false,
    );
  });
}
