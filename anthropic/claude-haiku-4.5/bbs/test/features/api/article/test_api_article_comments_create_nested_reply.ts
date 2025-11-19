import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_article_comments_create_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account for posting comments
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "SecurePass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor account created successfully",
    contributor.email_verified,
    false,
  );

  // Step 2: Create article that will receive comments
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Discussion on Economic Policy",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 4,
            sentenceMax: 8,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "https://example.com/create-article",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article created in draft or publishable status",
    article.status === "draft" || article.status === "published",
  );

  // Step 3: Post top-level comment on article
  const topLevelComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "This is an important discussion point that needs further analysis.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  TestValidator.predicate(
    "top-level comment has no parent",
    topLevelComment.parentComment === null ||
      topLevelComment.parentComment === undefined,
  );
  TestValidator.equals(
    "top-level comment initial reply count is zero",
    topLevelComment.reply_count,
    0,
  );
  TestValidator.predicate(
    "top-level comment has valid attachments array",
    Array.isArray(topLevelComment.attachments),
  );

  // Step 4: Create nested reply to the top-level comment
  const nestedReply =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "I agree with this point. Here is additional evidence to support it.",
          parentCommentId: topLevelComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(nestedReply);
  TestValidator.predicate(
    "nested reply has parent comment linked",
    nestedReply.parentComment !== null &&
      nestedReply.parentComment !== undefined,
  );

  // Step 5: Verify nested reply structure
  if (
    nestedReply.parentComment !== null &&
    nestedReply.parentComment !== undefined
  ) {
    TestValidator.equals(
      "nested reply parent ID matches top-level comment",
      nestedReply.parentComment.id,
      topLevelComment.id,
    );
  }
  TestValidator.equals(
    "nested reply author is the contributor",
    nestedReply.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "nested reply belongs to correct article",
    nestedReply.article.id,
    article.id,
  );
  TestValidator.predicate(
    "nested reply has valid edit tracking",
    nestedReply.edit_count >= 0,
  );
  TestValidator.predicate(
    "nested reply has valid reply count initialization",
    nestedReply.reply_count >= 0,
  );
  TestValidator.predicate(
    "nested reply has attachments array",
    Array.isArray(nestedReply.attachments),
  );

  // Step 6: Verify hierarchical structure preservation
  TestValidator.predicate(
    "nested reply is marked as not deleted",
    nestedReply.is_deleted === false,
  );
  TestValidator.predicate(
    "nested reply has creation timestamp",
    nestedReply.created_at !== null && nestedReply.created_at !== undefined,
  );
}
