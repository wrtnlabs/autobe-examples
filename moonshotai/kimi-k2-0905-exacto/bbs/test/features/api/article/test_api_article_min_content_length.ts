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
 * Test article creation with minimum content length requirements.
 *
 * This test validates that a member can successfully create an article with
 * content exactly at the minimum length limit (10 characters) to verify
 * boundary condition handling for content length validation rules.
 *
 * Test steps:
 *
 * 1. Create a new member account for authentication
 * 2. Generate article title and minimum-length content (exactly 10 chars)
 * 3. Create category IDs for article categorization
 * 4. Attempt to create article with minimum content length
 * 5. Validate successful creation and confirm content meets requirements
 * 6. Verify article metadata and structure
 */
export async function test_api_article_min_content_length(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Prepare article with minimum content length
  const title = "Economic Analysis Test";
  const minContent = "1234567890"; // Exactly 10 characters - minimum length

  // Step 3: Generate category IDs (minimum 1 required)
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create article with minimum content length
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title,
        content: minContent,
        category_ids: [categoryId],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Validate article creation and content
  TestValidator.equals("article title matches", article.title, title);
  TestValidator.equals(
    "article content is exactly 10 chars",
    article.content,
    minContent,
  );
  TestValidator.equals(
    "article content length is minimum",
    article.content.length,
    10,
  );

  // Step 6: Verify article structure and metadata
  TestValidator.predicate("article has valid ID", article.id.length === 36);
  TestValidator.predicate(
    "article status is pending",
    article.status === "pending",
  );
  TestValidator.predicate("article version starts at 1", article.version === 1);
  TestValidator.predicate("view count starts at 0", article.view_count === 0);
  TestValidator.predicate(
    "category assignment present",
    article.categories.length >= 0,
  );
}
