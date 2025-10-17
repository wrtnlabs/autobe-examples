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

export async function test_api_topic_public_retrieval_after_member_creation(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins to create category infrastructure
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Administrator creates a category for topic organization
  const categoryData = {
    name: RandomGenerator.pick([
      "Economics",
      "Politics",
      "Current Events",
    ] as const),
    slug: RandomGenerator.pick([
      "economics",
      "politics",
      "current-events",
    ] as const),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
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

  // Step 3: Member joins the platform to create topics
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 4: Member creates a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const createdTopic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(createdTopic);

  // Step 5: Public user (unauthenticated) retrieves the topic
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const retrievedTopic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.topics.at(unauthenticatedConnection, {
      topicId: createdTopic.id,
    });
  typia.assert(retrievedTopic);

  // Validate topic details are accessible and complete
  TestValidator.equals("topic ID matches", retrievedTopic.id, createdTopic.id);
  TestValidator.equals(
    "topic title matches",
    retrievedTopic.title,
    topicData.title,
  );
  TestValidator.equals(
    "topic body matches",
    retrievedTopic.body,
    topicData.body,
  );
  TestValidator.equals(
    "topic status is active",
    retrievedTopic.status,
    "active",
  );

  // Validate category information is properly expanded
  TestValidator.equals(
    "category ID matches",
    retrievedTopic.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedTopic.category.name,
    category.name,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedTopic.category.slug,
    category.slug,
  );

  // Validate author information is properly populated
  TestValidator.equals(
    "author ID matches",
    retrievedTopic.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedTopic.author.username,
    memberCredentials.username,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedTopic.author.display_name,
    memberCredentials.display_name,
  );

  // Validate engagement metrics
  TestValidator.predicate(
    "view count is non-negative",
    retrievedTopic.view_count >= 0,
  );
  TestValidator.predicate(
    "reply count is non-negative",
    retrievedTopic.reply_count >= 0,
  );

  // Validate tags array exists (even if empty)
  TestValidator.predicate(
    "tags array exists",
    Array.isArray(retrievedTopic.tags),
  );
}
