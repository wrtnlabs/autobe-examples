import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

export async function test_api_moderator_article_multimedia_support(
  connection: api.IConnection,
) {
  // 1. Create moderator account with enhanced access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphabets(32),
      email_verified: true,
      two_factor_enabled: true,
      moderation_level: RandomGenerator.pick([
        "standard",
        "senior",
        "admin",
      ] as const),
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create discussion category for multimedia content
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create article with comprehensive multimedia attachments
  const articleContent = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  // Generate multiple attachment types for rich media support
  const attachments = ArrayUtil.repeat(3, (index) => {
    const fileTypes = ["image", "document", "spreadsheet"] as const;
    const selectedType = fileTypes[index % 3];

    return {
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<1048576>
      >(),
      file_type: selectedType,
      filename: `${RandomGenerator.alphabets(8)}.${selectedType === "image" ? "jpg" : selectedType === "document" ? "pdf" : "xlsx"}`,
      mime_type:
        selectedType === "image"
          ? "image/jpeg"
          : selectedType === "document"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    } satisfies IEconomicDiscussionAttachments.ICreate;
  });

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          category_ids: [category.id],
          attachments,
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);

  // 4. Validate all multimedia features were properly created
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article has moderator author",
    article.moderator_author,
    moderator.id,
  );
  TestValidator.equals("article status is pending", article.status, "pending");
  TestValidator.equals("article version is 1", article.version, 1);
  TestValidator.equals(
    "article has category associations",
    article.categories.length,
    1,
  );
  TestValidator.equals(
    "first category matches",
    article.categories[0].id,
    category.id,
  );

  // 5. Test article creation without attachments (minimal case)
  const minimalArticle =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          category_ids: [category.id],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(minimalArticle);

  TestValidator.equals(
    "minimal article created successfully",
    minimalArticle.moderator_author,
    moderator.id,
  );
  TestValidator.predicate(
    "minimal article has no attachments",
    minimalArticle.categories.length > 0,
  );
}
