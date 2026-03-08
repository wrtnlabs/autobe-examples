import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";

export async function test_api_article_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create initial article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 3. Prepare update data
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const updatedTags = ["updated", "test", "article"];
  const updateBody = {
    title: updatedTitle,
    content: updatedContent,
    tags: updatedTags,
  } satisfies IDiscussionBoardArticle.IUpdate;
  // 4. Update the article
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate update results
  TestValidator.equals("article id unchanged", updatedArticle.id, article.id);
  TestValidator.equals("title updated", updatedArticle.title, updatedTitle);
  TestValidator.equals(
    "content updated",
    updatedArticle.content,
    updatedContent,
  );
  TestValidator.equals("author unchanged", updatedArticle.author.id, member.id);
  TestValidator.equals(
    "section unchanged",
    updatedArticle.section.id,
    article.section.id,
  );
  // Validate tags
  const tagNames = updatedArticle.tags.map((tag) => tag.name);
  TestValidator.predicate(
    "tags updated",
    updatedTags.every((t) => tagNames.includes(t)),
  );
  // Validate timestamp
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedArticle.updated_at) > new Date(article.created_at),
  );
}
