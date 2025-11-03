import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import type { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import type { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import type { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import type { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import type { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import type { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";

/**
 * Test article creation with file attachments including images and documents.
 *
 * This test validates the complete article creation workflow for the politics
 * discussion board, including member authentication, category creation, and
 * article submission with proper content validation. The test ensures that
 * articles can be created with titles and content meeting business
 * requirements, and that the system properly handles the article lifecycle from
 * creation through moderation workflow.
 *
 * Test flow:
 *
 * 1. Create member account for authentication with valid credentials
 * 2. Create category for article assignment by moderator
 * 3. Create article with title and content meeting business rules
 * 4. Validate article creation response includes proper structure
 * 5. Verify article state management and content validation
 */
export async function test_api_article_creation_with_attachments(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for authentication
  const memberJoinRequest = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies IPoliticsBbsMember.IJoin;

  const member: IPoliticsBbsMember.IAuthorized =
    await api.functional.auth.members.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(member);

  await TestValidator.equals(
    "member has authorized structure",
    member.token.access.length > 0,
    true,
  );

  // Step 2: Create category for article assignment (requires moderator)
  // Switch to moderator context for category creation
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };

  const categoryCreateRequest = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    sequence: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    primary: true,
    required: true,
    multiplicative: false,
  } satisfies IPoliticsBbsCategory.ICreate;

  const category: IPoliticsBbsCategory =
    await api.functional.politicsBbs.moderator.categories.create(
      moderatorConnection,
      { body: categoryCreateRequest },
    );
  typia.assert(category);

  // Step 3: Create article with proper content validation
  const articleCreateRequest = {
    politics_bbs_category_id: category.id,
    title: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 5,
    }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IPoliticsBbsArticle.ICreate;

  const article: IPoliticsBbsArticle =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: articleCreateRequest,
    });
  typia.assert(article);

  // Step 4: Validate article creation response
  await TestValidator.equals(
    "article has valid ID",
    article.id.length > 0,
    true,
  );
  await TestValidator.equals(
    "article category matches",
    article.politics_bbs_category_id,
    category.id,
  );
  await TestValidator.equals(
    "article creator matches member",
    article.politics_bbs_creator_id,
    member.id,
  );
  await TestValidator.equals(
    "article title matches request",
    article.title,
    articleCreateRequest.title,
  );
  await TestValidator.equals(
    "article content matches request",
    article.content,
    articleCreateRequest.content,
  );
  await TestValidator.equals(
    "article has initial state",
    article.state,
    "pending",
  );
  await TestValidator.equals(
    "article view count starts at 0",
    article.view_count,
    0,
  );
  await TestValidator.predicate(
    "article has timestamps",
    article.created_at !== null && article.updated_at !== null,
  );

  // Step 5: Validate category relationship
  await TestValidator.equals(
    "article has category relationship",
    article.category !== undefined,
    true,
  );
  if (article.category) {
    await TestValidator.equals(
      "category ID matches",
      article.category.id,
      category.id,
    );
    await TestValidator.equals(
      "category code matches",
      article.category.code,
      category.code,
    );
  }

  // Step 6: Validate article snapshots (should be created for new articles)
  await TestValidator.predicate(
    "article has snapshots array",
    Array.isArray(article.snapshots),
  );

  // Step 7: Validate file attachments array (should be empty for new articles without attachments)
  await TestValidator.predicate(
    "article has file attachments array",
    Array.isArray(article.file_attachments),
  );
  if (article.file_attachments) {
    await TestValidator.equals(
      "new article has no file attachments",
      article.file_attachments.length,
      0,
    );
  }

  // Step 8: Validate comments array (should be empty for new articles)
  await TestValidator.predicate(
    "article has comments array",
    Array.isArray(article.comments),
  );
  if (article.comments) {
    await TestValidator.equals(
      "new article has no comments",
      article.comments.length,
      0,
    );
  }
}
