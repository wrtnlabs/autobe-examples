import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_multiple_same_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create an article for commenting
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(article);
  // 3. Create first comment
  const comment1 =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content:
            "First comment on this article sharing my initial thoughts. This is a comprehensive response to the article content.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  // 4. Create second comment
  const comment2 =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content:
            "Second comment with additional perspective on the topic. I wanted to share more insights after reading the article.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  // 5. Create third comment
  const comment3 =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content:
            "Third comment providing even more context and details. The article raises interesting points worth discussing further.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment3);
  // 6. Validate each comment has unique id
  TestValidator.notEquals(
    "comment1 and comment2 have different ids",
    comment1.id,
    comment2.id,
  );
  TestValidator.notEquals(
    "comment2 and comment3 have different ids",
    comment2.id,
    comment3.id,
  );
  TestValidator.notEquals(
    "comment1 and comment3 have different ids",
    comment1.id,
    comment3.id,
  );
  // 7. Validate all comments reference the same article
  TestValidator.equals(
    "comment1 article matches",
    comment1.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment2 article matches",
    comment2.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment3 article matches",
    comment3.article.id,
    article.id,
  );
  // 8. Validate all comments reference the same author
  TestValidator.equals(
    "comment1 author matches",
    comment1.author.id,
    member.id,
  );
  TestValidator.equals(
    "comment2 author matches",
    comment2.author.id,
    member.id,
  );
  TestValidator.equals(
    "comment3 author matches",
    comment3.author.id,
    member.id,
  );
  // 9. Validate comment contents match their submissions
  TestValidator.equals(
    "comment1 content matches",
    comment1.content,
    "First comment on this article sharing my initial thoughts. This is a comprehensive response to the article content.",
  );
  TestValidator.equals(
    "comment2 content matches",
    comment2.content,
    "Second comment with additional perspective on the topic. I wanted to share more insights after reading the article.",
  );
  TestValidator.equals(
    "comment3 content matches",
    comment3.content,
    "Third comment providing even more context and details. The article raises interesting points worth discussing further.",
  );
}
