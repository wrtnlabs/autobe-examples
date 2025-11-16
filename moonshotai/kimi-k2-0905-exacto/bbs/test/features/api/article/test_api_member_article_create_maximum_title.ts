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
 * Test article creation with maximum allowed title length (500 characters) to
 * verify system boundary handling. This test ensures that long titles are
 * properly stored and returned correctly without truncation or system errors.
 *
 * 1. Register a new member account for testing
 * 2. Generate a title with exactly 500 characters (maximum allowed)
 * 3. Create an article with the maximum length title
 * 4. Verify the article is created successfully
 * 5. Validate that the full title is preserved in the response
 */
export async function test_api_member_article_create_maximum_title(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for testing
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Generate a title with exactly 500 characters (maximum allowed)
  const maxTitle = ArrayUtil.repeat(500, () =>
    RandomGenerator.pick([
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ",
    ]),
  ).join("");

  // Step 3: Create category IDs - at least one required
  const categoryIds = [typia.random<string & tags.Format<"uuid">>()];

  // Step 4: Create an article with the maximum length title
  const articleCreateData = {
    title: maxTitle,
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_ids: categoryIds,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleCreateData,
    });
  typia.assert(article);

  // Step 5: Validate that the full title is preserved in the response
  TestValidator.equals("article title matches input", article.title, maxTitle);
  TestValidator.equals(
    "article title length is 500",
    article.title.length,
    500,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleCreateData.content,
  );
  TestValidator.equals("article has correct status", article.status, "pending");
}
