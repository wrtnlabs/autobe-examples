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
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

/**
 * Test that removing a tag from an article does not delete the tag itself.
 * Validates tag persistence and reusability after removal from articles.
 */
export async function test_api_article_tag_persistence_after_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "Section for tag persistence test",
        },
      },
    );
  typia.assert(section);
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 3. Create a tag
  const tagName = RandomGenerator.alphabets(8);
  const tag = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: {
        name: tagName,
      },
    },
  );
  typia.assert(tag);
  // 4. Create an article with the tag
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: "Test Article",
        content: "This is test content for tag persistence validation.",
        section_id: section.id,
        tags: [tagName],
      },
    },
  );
  typia.assert(article);
  // Verify tag was assigned to article
  TestValidator.equals(
    "tag assigned to article",
    article.tags.some((t) => t.id === tag.id),
    true,
  );
  // 5. Remove the tag from the article
  await api.functional.discussionBoard.member.articles.tags.erase(
    memberConnection,
    {
      articleId: article.id,
      tagId: tag.id,
    },
  );
  // 6. Verify tag still exists by creating another article with the same tag
  const secondArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Second Test Article",
          content: "Second article to verify tag persistence.",
          section_id: section.id,
          tags: [tagName],
        },
      },
    );
  typia.assert(secondArticle);
  // 7. Validate tag is still available and can be assigned to another article
  TestValidator.equals(
    "tag still exists and reusable",
    secondArticle.tags.some((t) => t.id === tag.id),
    true,
  );
  // 8. Verify the tag ID matches the original tag
  TestValidator.equals(
    "tag ID unchanged",
    secondArticle.tags.find((t) => t.name === tagName)?.id,
    tag.id,
  );
}
