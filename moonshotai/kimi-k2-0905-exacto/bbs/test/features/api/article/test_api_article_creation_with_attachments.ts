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
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

export async function test_api_article_creation_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorData = typia.random<IEconomicDiscussionModerator.ICreate>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create categories as moderator
  const categoryData = {
    code: "economics",
    name: "Economics",
    description: "Economic analysis and discussions",
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article creation
  const memberData = {
    username: RandomGenerator.name(1),
    email: "test-member@example.com",
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Login as member for article creation
  const memberLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: memberData.email,
      password_hash: memberData.password,
    },
  });
  typia.assert(memberLogin);

  // Step 5: Create article with multiple file attachments
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 8,
  });

  const attachments = ArrayUtil.repeat(3, (index) => {
    const fileTypes = ["image", "document", "spreadsheet"] as const;
    const fileType = fileTypes[index % fileTypes.length];

    const mimeTypes = {
      image: "image/png",
      document: "application/pdf",
      spreadsheet:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    return {
      file_size: RandomGenerator.pick([1048576, 524288, 2097152]), // Random sizes within limits
      file_type: fileType,
      filename: `${RandomGenerator.name(1)}-${fileType}.${fileType === "image" ? "png" : fileType === "document" ? "pdf" : "xlsx"}`,
      mime_type: mimeTypes[fileType],
    } satisfies IEconomicDiscussionAttachments.ICreate;
  });

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: articleContent,
    category_ids: [category.id],
    attachments: attachments,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 6: Validate article creation with attachments
  TestValidator.equals(
    "article title matches",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    articleData.content,
  );
  TestValidator.predicate(
    "article has categories",
    article.categories.length > 0,
  );
  TestValidator.equals(
    "article category ID matches",
    article.categories[0].id,
    category.id,
  );

  // Step 7: Test file size limitation
  await TestValidator.error(
    "article creation should fail with oversized attachment",
    async () => {
      const oversizedData = {
        title: "Test Article with Large File",
        content: "Test content",
        category_ids: [category.id],
        attachments: [
          {
            file_size: 10485761, // Exceeds 10MB limit
            file_type: "document",
            filename: "oversized.pdf",
            mime_type: "application/pdf",
          },
        ],
      } satisfies IEconomicDiscussionArticle.ICreate;

      return await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: oversizedData,
        },
      );
    },
  );
}
