import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_tag_update_add_and_remove(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test article tag update functionality - add and remove tags.
   *
   * This test validates the complete workflow of updating article tags:
   * 1. Administrator creates a section for article organization
   * 2. Member creates an article with initial tags
   * 3. Member updates the article tags by adding new ones and removing existing ones
   * 4. Validates the response contains correct tag assignments
   */
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Technology Discussion",
          description: "Articles about technology and innovation",
        },
      },
    );
  typia.assert(section);
  // 2. Member setup - create article with initial tags
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  const initialTags = ["javascript", "programming"];
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        tags: initialTags,
      },
    },
  );
  typia.assert(article);
  // Store initial tag information for validation
  const initialTagIds = article.tags.map((tag) => tag.id);
  const initialTagNames = article.tags.map((tag) => tag.name);
  TestValidator.equals(
    "initial tags count",
    initialTags.length,
    article.tags.length,
  );
  // 3. Update article tags - add new tags and remove one existing tag
  const tagsToAdd = ["technology", "innovation"];
  const tagsToRemove = [initialTagIds[0]]; // Remove the first initial tag
  const updatedTags =
    await api.functional.discussionBoard.articles.tags.updateTags(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tagsToAdd,
          tagsToRemove,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(updatedTags);
  // 4. Validate response structure
  TestValidator.equals(
    "response article matches original",
    updatedTags.article.id,
    article.id,
  );
  TestValidator.equals(
    "response article title matches",
    updatedTags.article.title,
    article.title,
  );
  // 5. Validate the tag in response belongs to the article
  TestValidator.predicate(
    "tag is assigned to correct article",
    updatedTags.article.id === article.id,
  );
  // 6. Validate tag has valid properties
  TestValidator.predicate("tag has valid ID", updatedTags.tag.id != null);
  TestValidator.predicate("tag has valid name", updatedTags.tag.name != null);
  // 7. Validate business logic - the response should contain one of the updated tags
  // Since the API returns a single tag object, we verify it's one of the expected tags
  const expectedTagNames = [
    ...initialTagNames.filter((_, idx) => idx !== 0), // Keep tags except removed one
    ...tagsToAdd, // Add new tags
  ];
  TestValidator.predicate(
    "response tag is in expected set",
    expectedTagNames.includes(updatedTags.tag.name),
  );
  // 8. Validate removed tag is not the one in response
  TestValidator.notEquals(
    "removed tag is not in response",
    updatedTags.tag.id,
    tagsToRemove[0],
  );
  // 9. Validate timestamp is present
  TestValidator.predicate(
    "tag assignment has creation timestamp",
    updatedTags.created_at != null,
  );
}
