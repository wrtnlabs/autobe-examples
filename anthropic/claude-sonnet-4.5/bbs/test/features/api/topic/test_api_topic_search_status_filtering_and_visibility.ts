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

export async function test_api_topic_search_status_filtering_and_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create category as admin
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: As member, create multiple topics
  const createdTopics: IDiscussionBoardTopic[] = [];

  for (let i = 0; i < 5; i++) {
    const topicData = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      category_id: category.id,
      tag_ids: null,
    } satisfies IDiscussionBoardTopic.ICreate;

    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: topicData,
      },
    );
    typia.assert(topic);
    createdTopics.push(topic);
  }

  // Step 5: Verify all created topics have status field
  TestValidator.predicate(
    "all created topics have status field",
    createdTopics.every(
      (t) =>
        t.status === "active" ||
        t.status === "locked" ||
        t.status === "archived" ||
        t.status === "deleted",
    ),
  );

  // Step 6: Search without status filter and verify topics are returned
  const allTopicsSearch = await api.functional.discussionBoard.topics.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        category_id: category.id,
      } satisfies IDiscussionBoardTopic.IRequest,
    },
  );
  typia.assert(allTopicsSearch);

  TestValidator.predicate(
    "search returns topics from the category",
    allTopicsSearch.data.length > 0,
  );

  TestValidator.predicate(
    "all returned topics include status field",
    allTopicsSearch.data.every((t) =>
      ["active", "locked", "archived", "deleted"].includes(t.status),
    ),
  );

  // Step 7: Test status filtering - search with specific status
  const currentStatus = createdTopics[0].status;
  const statusFilteredSearch =
    await api.functional.discussionBoard.topics.index(connection, {
      body: {
        page: 1,
        limit: 25,
        category_id: category.id,
        status: currentStatus,
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(statusFilteredSearch);

  TestValidator.predicate(
    "status filter parameter is accepted by search endpoint",
    statusFilteredSearch.data.every((t) => t.status === currentStatus),
  );

  // Step 8: Verify pagination metadata
  TestValidator.predicate(
    "pagination information is present",
    allTopicsSearch.pagination.current >= 0 &&
      allTopicsSearch.pagination.limit > 0 &&
      allTopicsSearch.pagination.records >= 0 &&
      allTopicsSearch.pagination.pages >= 0,
  );

  // Step 9: Verify topic summaries include required fields
  if (allTopicsSearch.data.length > 0) {
    const firstTopic = allTopicsSearch.data[0];
    typia.assert(firstTopic);

    TestValidator.predicate(
      "topic summary includes all required metadata",
      firstTopic.id !== undefined &&
        firstTopic.title !== undefined &&
        firstTopic.status !== undefined &&
        firstTopic.view_count !== undefined &&
        firstTopic.reply_count !== undefined &&
        firstTopic.is_pinned !== undefined &&
        firstTopic.created_at !== undefined &&
        firstTopic.updated_at !== undefined,
    );
  }
}
