import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 2: Create two articles using generation utility
  const article1 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >() satisfies string as string,
      },
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >() satisfies string as string,
      },
    },
  );
  typia.assert(article2);
  // Step 3: Add tag to first article
  const tagName = RandomGenerator.alphabets(10);
  const tag1 = await api.functional.discussionBoard.admin.articles.tags.create(
    adminConnection,
    {
      articleId: article1.id,
      body: {
        tag_name: tagName,
      } satisfies IDiscussionBoardArticleTag.ICreate,
    },
  );
  typia.assert(tag1);
  TestValidator.equals("tag name matches", tag1.tag_name, tagName);
  TestValidator.equals(
    "article id matches",
    tag1.discussion_board_article_id,
    article1.id,
  );
  // Step 4: Attempt duplicate tag on same article
  await TestValidator.error("duplicate tag on same article", async () => {
    await api.functional.discussionBoard.admin.articles.tags.create(
      adminConnection,
      {
        articleId: article1.id,
        body: {
          tag_name: tagName,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
  // Step 5: Test case sensitivity normalization
  // Based on utility function spec: 'Normalize tag name by trimming whitespace and converting to lowercase'
  // So uppercase variation should normalize to lowercase and be duplicate
  const upperCaseTagName = tagName.toUpperCase();
  if (upperCaseTagName !== tagName) {
    await TestValidator.error(
      "uppercase variation should normalize to lowercase and be duplicate",
      async () => {
        await api.functional.discussionBoard.admin.articles.tags.create(
          adminConnection,
          {
            articleId: article1.id,
            body: {
              tag_name: upperCaseTagName,
            } satisfies IDiscussionBoardArticleTag.ICreate,
          },
        );
      },
    );
  }
  // Step 6: Same tag name on different article (should be allowed)
  const tag2 = await api.functional.discussionBoard.admin.articles.tags.create(
    adminConnection,
    {
      articleId: article2.id,
      body: {
        tag_name: tagName,
      } satisfies IDiscussionBoardArticleTag.ICreate,
    },
  );
  typia.assert(tag2);
  TestValidator.equals(
    "tag name matches on second article",
    tag2.tag_name,
    tagName,
  );
  TestValidator.equals(
    "second article id matches",
    tag2.discussion_board_article_id,
    article2.id,
  );
  TestValidator.notEquals("different tag ids", tag1.id, tag2.id);
}
