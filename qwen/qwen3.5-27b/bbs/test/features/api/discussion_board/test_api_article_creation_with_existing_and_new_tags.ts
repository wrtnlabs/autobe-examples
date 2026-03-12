import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

/**
 * Test article creation with a mix of existing and new tags.
 * Verifies that the system correctly handles tag reuse and automatic tag creation.
 */
export async function test_api_article_creation_with_existing_and_new_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const section =
    await api.functional.discussionBoard.administrator.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 2. Member setup - authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create a pre-existing tag
  const existingTagName = RandomGenerator.name();
  const existingTag = await api.functional.discussionBoard.member.tags.create(
    memberConnection,
    {
      body: {
        name: existingTagName,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(existingTag);
  // 4. Create article with mix of existing and new tags
  const newTagName1 = RandomGenerator.name();
  const newTagName2 = RandomGenerator.name();
  const articleTitle = RandomGenerator.paragraph({ sentences: 2 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: articleTitle,
        content: articleContent,
        section_id: section.id,
        tags: [existingTagName, newTagName1, newTagName2],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Verify article was created successfully
  TestValidator.equals("article has valid ID", typeof article.id, "string");
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals(
    "article section matches",
    article.section.id,
    section.id,
  );
  // 6. Verify all tags are present in the response
  TestValidator.predicate("article has 3 tags", article.tags.length === 3);
  // 7. Verify existing tag is reused (same ID as pre-created tag)
  const reusedTag = article.tags.find((t) => t.name === existingTagName);
  TestValidator.predicate(
    "existing tag found in article",
    reusedTag !== undefined,
  );
  typia.assertGuard(reusedTag!);
  TestValidator.equals("existing tag ID matches", reusedTag.id, existingTag.id);
  // 8. Verify new tags were created
  const newTag1 = article.tags.find((t) => t.name === newTagName1);
  const newTag2 = article.tags.find((t) => t.name === newTagName2);
  TestValidator.predicate("new tag 1 found", newTag1 !== undefined);
  TestValidator.predicate("new tag 2 found", newTag2 !== undefined);
  typia.assertGuard(newTag1!);
  typia.assertGuard(newTag2!);
  // 9. Verify new tags have different IDs from existing tag
  TestValidator.notEquals(
    "new tag 1 ID differs from existing",
    newTag1.id,
    existingTag.id,
  );
  TestValidator.notEquals(
    "new tag 2 ID differs from existing",
    newTag2.id,
    existingTag.id,
  );
  TestValidator.notEquals(
    "new tag IDs differ from each other",
    newTag1.id,
    newTag2.id,
  );
  // 10. Verify all tags have unique IDs
  const tagIds = article.tags.map((t) => t.id);
  const uniqueTagIds = new Set(tagIds);
  TestValidator.equals(
    "all tag IDs are unique",
    uniqueTagIds.size,
    tagIds.length,
  );
  // 11. Verify tag names match exactly (case-sensitive)
  const tagNames = article.tags.map((t) => t.name).sort();
  const expectedTagNames = [existingTagName, newTagName1, newTagName2].sort();
  TestValidator.equals("tag names match exactly", tagNames, expectedTagNames);
}
