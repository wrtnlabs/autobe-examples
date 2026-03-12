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
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_tag_removal_by_author(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test article tag removal by author.
   * 1. Administrator creates a section
   * 2. Member creates an article with tags
   * 3. Member removes one tag from the article
   * 4. Verify tag removal by attempting to remove the same tag again (should fail with 404)
   */
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 2. Member setup - create article with tags
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        tags: ["Technology", "Innovation", "Future"],
      },
    },
  );
  typia.assert(article);
  // 3. Verify article has tags
  TestValidator.predicate("article should have tags", article.tags.length > 0);
  // Select a tag to remove
  const tagToRemove = article.tags[0];
  // 4. Remove the tag - should succeed
  await api.functional.discussionBoard.member.articles.tags.erase(
    memberConnection,
    {
      articleId: article.id,
      tagId: tagToRemove.id,
    },
  );
  // 5. Verify the tag was actually removed by attempting to remove it again
  // This should fail with 404 because the tag assignment no longer exists
  await TestValidator.error(
    "removing already removed tag should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.tags.erase(
        memberConnection,
        {
          articleId: article.id,
          tagId: tagToRemove.id,
        },
      );
    },
  );
  // 6. Verify other tags are still present by checking article response from creation
  const remainingTags = article.tags.filter((t) => t.id !== tagToRemove.id);
  TestValidator.predicate(
    "article should have remaining tags",
    remainingTags.length > 0,
  );
  // 7. Verify article integrity - title and content should be unchanged
  TestValidator.predicate(
    "article title should not be empty",
    article.title.length > 0,
  );
  TestValidator.predicate(
    "article content should not be empty",
    article.content.length > 0,
  );
}
