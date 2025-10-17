import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";

export async function test_api_topic_search_public_access_guest_browsing(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  const economicsCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          description: "Economic discussions and analysis",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(economicsCategory);

  const politicsCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          description: "Political discussions and debates",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member1Email,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  const economicsTopic1 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "Inflation and Monetary Policy Discussion",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_id: economicsCategory.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(economicsTopic1);

  const economicsTopic2 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "Global Trade and Economic Growth",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        category_id: economicsCategory.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(economicsTopic2);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member2Email,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  const politicsTopic1 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "International Relations and Diplomacy",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 12,
          sentenceMax: 18,
        }),
        category_id: politicsCategory.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(politicsTopic1);

  const politicsTopic2 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "Policy Analysis and Reform",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 16,
        }),
        category_id: politicsCategory.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(politicsTopic2);

  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const guestSearchResult = await api.functional.discussionBoard.topics.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(guestSearchResult);

  TestValidator.predicate(
    "guest search should return topics",
    guestSearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "guest search should return all created topics",
    guestSearchResult.data.length >= 4,
  );

  TestValidator.predicate(
    "pagination current page should be 1",
    guestSearchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 25",
    guestSearchResult.pagination.limit === 25,
  );
  TestValidator.predicate(
    "pagination records should match data length",
    guestSearchResult.pagination.records >= guestSearchResult.data.length,
  );

  const economicsFilterResult =
    await api.functional.discussionBoard.topics.index(guestConnection, {
      body: {
        page: 1,
        limit: 25,
        category_id: economicsCategory.id,
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(economicsFilterResult);

  TestValidator.predicate(
    "economics category filter should return economics topics",
    economicsFilterResult.data.length >= 2,
  );
  TestValidator.predicate(
    "all returned topics should be in economics category",
    economicsFilterResult.data.every(
      (topic) => topic.category.id === economicsCategory.id,
    ),
  );

  const keywordSearchResult = await api.functional.discussionBoard.topics.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 25,
        search: "Policy",
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(keywordSearchResult);

  TestValidator.predicate(
    "keyword search should return matching topics",
    keywordSearchResult.data.length > 0,
  );

  const sortedByNewestResult =
    await api.functional.discussionBoard.topics.index(guestConnection, {
      body: {
        page: 1,
        limit: 25,
        sort_by: "newest",
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(sortedByNewestResult);

  TestValidator.predicate(
    "sorted by newest should return topics",
    sortedByNewestResult.data.length > 0,
  );

  const firstTopic = guestSearchResult.data[0];
  typia.assert(firstTopic);
  TestValidator.predicate(
    "topic should have id",
    typeof firstTopic.id === "string",
  );
  TestValidator.predicate(
    "topic should have title",
    typeof firstTopic.title === "string",
  );
  TestValidator.predicate(
    "topic should have category information",
    firstTopic.category !== null &&
      typeof firstTopic.category.name === "string",
  );
  TestValidator.predicate(
    "topic should have author information",
    firstTopic.author !== null &&
      typeof firstTopic.author.username === "string",
  );
  TestValidator.predicate(
    "topic should have view count",
    typeof firstTopic.view_count === "number",
  );
  TestValidator.predicate(
    "topic should have reply count",
    typeof firstTopic.reply_count === "number",
  );
  TestValidator.predicate(
    "topic should have created timestamp",
    typeof firstTopic.created_at === "string",
  );
  TestValidator.predicate(
    "topic should have updated timestamp",
    typeof firstTopic.updated_at === "string",
  );

  const paginationTestResult =
    await api.functional.discussionBoard.topics.index(guestConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(paginationTestResult);

  TestValidator.predicate(
    "pagination limit of 2 should return at most 2 topics",
    paginationTestResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination limit should be set to 2",
    paginationTestResult.pagination.limit === 2,
  );
}
