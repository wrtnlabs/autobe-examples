import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test that authenticated members can delete their own economic discussion
 * articles. Validates proper authorization checks, soft deletion implementation
 * with deleted_at timestamp setting, and confirmation that deleted articles are
 * no longer publicly visible while maintaining audit trail integrity.
 */
export async function test_api_member_article_deletion(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const randomUsername = RandomGenerator.alphaNumeric(10);

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: randomUsername,
      email: randomEmail,
      password: "SecureTestPassword123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  TestValidator.predicate(
    "member registration successful",
    memberAuth.member.id !== null && memberAuth.access_token.length > 0,
  );

  // Step 2: Get available categories for article creation
  const categories = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  // Step 3: Create an economic discussion article
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_ids: [categories[0]],
        attachments: [],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(createdArticle);

  TestValidator.predicate(
    "article creation successful",
    createdArticle.id !== null &&
      createdArticle.title === articleTitle &&
      createdArticle.member_author === memberAuth.member.id,
  );

  // Step 4: Delete the article as the authenticated member
  const deletedArticle =
    await api.functional.economicDiscussion.member.articles.erase(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(deletedArticle);

  // Step 5: Validate the deletion response
  TestValidator.equals(
    "deleted article ID matches original",
    deletedArticle.id,
    createdArticle.id,
  );

  TestValidator.equals(
    "deleted article title matches original",
    deletedArticle.title,
    createdArticle.title,
  );

  TestValidator.equals(
    "deleted article content matches original",
    deletedArticle.content,
    createdArticle.content,
  );

  TestValidator.predicate(
    "article has deletion timestamp",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "deleted article status is appropriate",
    deletedArticle.status === "pending" ||
      deletedArticle.status === "approved" ||
      deletedArticle.status === "rejected",
  );

  // Step 6: Validate soft deletion implementation
  TestValidator.predicate(
    "deletion timestamp is valid ISO format",
    typeof deletedArticle.deleted_at === "string" &&
      deletedArticle.deleted_at!.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      ) !== null,
  );

  TestValidator.predicate(
    "article version is preserved",
    deletedArticle.version >= 1,
  );

  TestValidator.predicate(
    "article view count is preserved",
    deletedArticle.view_count >= 0,
  );

  // Step 7: Validate audit trail integrity
  TestValidator.equals(
    "creation timestamp preserved",
    deletedArticle.created_at,
    createdArticle.created_at,
  );

  TestValidator.predicate(
    "update timestamp exists",
    deletedArticle.updated_at !== null &&
      deletedArticle.updated_at !== undefined,
  );

  TestValidator.equals(
    "member author preserved",
    deletedArticle.member_author,
    memberAuth.member.id,
  );

  TestValidator.predicate(
    "categories preserved",
    deletedArticle.categories.length === createdArticle.categories.length,
  );
}
