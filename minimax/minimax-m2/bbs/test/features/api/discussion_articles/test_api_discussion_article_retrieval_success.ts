import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_discussion_article_retrieval_success(
  connection: api.IConnection,
) {
  // Generate a valid UUID for article retrieval
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the specific discussion article
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.at(connection, {
      articleId: articleId,
    });

  // Validate the complete article response
  typia.assert(article);

  // Validate core article fields are present and properly formatted
  TestValidator.equals("article has valid ID", article.id, articleId);
  TestValidator.predicate(
    "article title is non-empty string",
    typeof article.title === "string" && article.title.length > 0,
  );
  TestValidator.predicate(
    "article content is non-empty string",
    typeof article.content === "string" && article.content.length > 0,
  );
  TestValidator.predicate(
    "article category is valid string",
    typeof article.category === "string" && article.category.length > 0,
  );
  TestValidator.predicate(
    "article status is valid string",
    typeof article.status === "string" && article.status.length > 0,
  );

  // Validate author information is properly populated
  TestValidator.predicate(
    "author information exists",
    article.author !== null && article.author !== undefined,
  );
  TestValidator.equals(
    "author has valid ID",
    article.author.id,
    article.econ_political_discussion_user_id,
  );
  TestValidator.predicate(
    "author display name is present",
    typeof article.author.display_name === "string" &&
      article.author.display_name.length > 0,
  );
  TestValidator.predicate(
    "author status is valid",
    typeof article.author.status === "string" &&
      article.author.status.length > 0,
  );

  // Validate temporal data
  TestValidator.predicate(
    "created_at timestamp is valid",
    typeof article.created_at === "string" && article.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    typeof article.updated_at === "string" && article.updated_at.length > 0,
  );

  // Validate relationship consistency
  TestValidator.predicate(
    "author ID matches user reference",
    article.author.id === article.econ_political_discussion_user_id,
  );

  // Validate attachments if they exist
  if (article.attachments && article.attachments.length > 0) {
    const attachment = article.attachments[0];
    TestValidator.predicate(
      "attachment has valid ID",
      typeof attachment.id === "string" && attachment.id.length > 0,
    );
    TestValidator.predicate(
      "attachment has valid filename",
      typeof attachment.original_filename === "string" &&
        attachment.original_filename.length > 0,
    );
    TestValidator.predicate(
      "attachment has valid file type",
      typeof attachment.file_type === "string" &&
        attachment.file_type.length > 0,
    );
    TestValidator.predicate(
      "attachment has valid file size",
      typeof attachment.file_size === "number" && attachment.file_size >= 0,
    );
    TestValidator.predicate(
      "attachment has valid file URL",
      typeof attachment.file_url === "string" && attachment.file_url.length > 0,
    );
    TestValidator.predicate(
      "attachment has valid upload date",
      typeof attachment.upload_date === "string" &&
        attachment.upload_date.length > 0,
    );
    TestValidator.predicate(
      "attachment has uploader name",
      typeof attachment.uploader_name === "string" &&
        attachment.uploader_name.length > 0,
    );
    TestValidator.predicate(
      "attachment has security scan status",
      typeof attachment.security_scan_status === "string" &&
        attachment.security_scan_status.length > 0,
    );
    TestValidator.predicate(
      "attachment has moderation status",
      typeof attachment.moderation_status === "string" &&
        attachment.moderation_status.length > 0,
    );
    TestValidator.predicate(
      "attachment has public accessibility flag",
      typeof attachment.is_public === "boolean",
    );
  }

  // Validate that soft deletion timestamp is handled correctly
  if (article.deleted_at !== null && article.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at timestamp is valid when present",
      typeof article.deleted_at === "string" && article.deleted_at.length > 0,
    );
  }
}
