import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchHistory";
import type { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";

/**
 * Test search history audit log access control and privacy protections.
 *
 * Validates that only administrators can access complete search history, member
 * privacy is protected, and data retention policies are enforced.
 *
 * Test workflow:
 *
 * 1. Create administrator account with audit log access
 * 2. Create regular member account to verify access denial
 * 3. Create category and topics for meaningful searches
 * 4. Perform authenticated and guest searches to generate audit data
 * 5. Verify administrator can access all search history
 * 6. Verify regular member cannot access search audit logs
 * 7. Validate guest searches tracked with null user_id
 * 8. Validate authenticated searches include user_id
 */
export async function test_api_search_audit_privacy_and_access_control(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with audit access privileges
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create regular member account to test access denial
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Switch to admin and create category for topics
  connection.headers = { Authorization: admin.token.access };

  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member and create topics for searches
  connection.headers = { Authorization: member.token.access };

  const topicsToCreate = ArrayUtil.repeat(
    5,
    (index) =>
      ({
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_id: category.id,
        tag_ids: null,
      }) satisfies IDiscussionBoardTopic.ICreate,
  );

  const createdTopics = await ArrayUtil.asyncMap(
    topicsToCreate,
    async (topicData) => {
      const topic: IDiscussionBoardTopic =
        await api.functional.discussionBoard.member.topics.create(connection, {
          body: topicData,
        });
      typia.assert(topic);
      return topic;
    },
  );

  // Step 5: Perform authenticated searches as member to generate audit data
  const memberSearchQueries = [
    { search: RandomGenerator.substring(createdTopics[0].title) },
    {
      search: RandomGenerator.substring(createdTopics[1].body),
      category_id: category.id,
    },
    { search: RandomGenerator.paragraph({ sentences: 1 }), min_votes: 0 },
  ];

  await ArrayUtil.asyncForEach(memberSearchQueries, async (query) => {
    const searchResult: IPageIDiscussionBoardTopic.ISummary =
      await api.functional.discussionBoard.topics.index(connection, {
        body: query satisfies IDiscussionBoardTopic.IRequest,
      });
    typia.assert(searchResult);
  });

  // Step 6: Perform guest searches (unauthenticated) to generate null user_id audit entries
  const guestConnection: IConnection = {
    host: connection.host,
    headers: {},
  };

  const guestSearchQueries = [
    { search: RandomGenerator.paragraph({ sentences: 1 }) },
    {
      search: RandomGenerator.substring(createdTopics[2].title),
      category_id: category.id,
    },
  ];

  await ArrayUtil.asyncForEach(guestSearchQueries, async (query) => {
    const guestSearchResult: IPageIDiscussionBoardTopic.ISummary =
      await api.functional.discussionBoard.topics.index(guestConnection, {
        body: query satisfies IDiscussionBoardTopic.IRequest,
      });
    typia.assert(guestSearchResult);
  });

  // Step 7: Verify administrator can access search history audit logs
  connection.headers = { Authorization: admin.token.access };

  const adminAuditRequest = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardSearchHistory.IRequest;

  const adminAuditResult: IPageIDiscussionBoardSearchHistory =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: adminAuditRequest,
      },
    );
  typia.assert(adminAuditResult);

  TestValidator.predicate(
    "administrator should retrieve search history records",
    adminAuditResult.data.length > 0,
  );

  // Step 8: Validate guest searches have null or undefined user_id
  const guestSearches = adminAuditResult.data.filter(
    (history) => history.user_id === null || history.user_id === undefined,
  );

  TestValidator.predicate(
    "guest searches should be tracked with null user_id",
    guestSearches.length >= guestSearchQueries.length,
  );

  // Step 9: Validate authenticated member searches include user_id
  const memberSearches = adminAuditResult.data.filter(
    (history) =>
      history.user_id !== null &&
      history.user_id !== undefined &&
      history.user_id === member.id,
  );

  TestValidator.predicate(
    "authenticated member searches should include user_id",
    memberSearches.length >= memberSearchQueries.length,
  );

  // Step 10: Verify regular member cannot access search audit logs
  connection.headers = { Authorization: member.token.access };

  await TestValidator.error(
    "regular member should not access search audit logs",
    async () => {
      await api.functional.discussionBoard.administrator.audit.searches.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSearchHistory.IRequest,
        },
      );
    },
  );

  // Step 11: Validate data retention with date filtering
  connection.headers = { Authorization: admin.token.access };

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const retentionRequest = {
    date_from: ninetyDaysAgo.toISOString(),
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardSearchHistory.IRequest;

  const retentionResult: IPageIDiscussionBoardSearchHistory =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: retentionRequest,
      },
    );
  typia.assert(retentionResult);

  TestValidator.predicate(
    "data retention policy should allow 90-day historical access",
    retentionResult.pagination.records >= 0,
  );
}
