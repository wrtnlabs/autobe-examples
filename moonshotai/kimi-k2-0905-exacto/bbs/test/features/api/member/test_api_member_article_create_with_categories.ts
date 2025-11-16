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

export async function test_api_member_article_create_with_categories(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing article creation
  const username = RandomGenerator.alphabets(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: username,
      email: email,
      password: password,
      email_verified: false,
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authentication token exists",
    memberAuth.access_token.length > 0,
  );
  TestValidator.equals(
    "member username matches",
    memberAuth.member.username,
    username,
  );

  // Step 2: Generate category IDs for article organization
  const categoryId1 = typia.random<string & tags.Format<"uuid">>();
  const categoryId2 = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create article with comprehensive content and multiple categories
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 6,
  });
  const articleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 5,
  });

  const createArticleBody = {
    title: articleTitle,
    content: articleContent,
    category_ids: [categoryId1, categoryId2],
    attachments: [],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: createArticleBody,
    });
  typia.assert(createdArticle);

  // Step 4: Validate article creation results
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    createdArticle.content,
    articleContent,
  );
  TestValidator.equals(
    "article category count",
    createdArticle.categories.length,
    2,
  );
  TestValidator.equals(
    "article status is pending",
    createdArticle.status,
    "pending",
  );
  TestValidator.equals(
    "version is initialized to 1",
    createdArticle.version,
    1,
  );
  TestValidator.equals("view count starts at 0", createdArticle.view_count, 0);

  // Step 5: Validate author attribution to the authenticated member
  TestValidator.equals(
    "member author id matches",
    createdArticle.member_author,
    memberAuth.member.id,
  );
  if (createdArticle.member_author_profile !== undefined) {
    TestValidator.equals(
      "member author profile id matches",
      createdArticle.member_author_profile.id,
      memberAuth.member.id,
    );
    TestValidator.equals(
      "member author profile username matches",
      createdArticle.member_author_profile.username,
      memberAuth.member.username,
    );
  }

  // Step 6: Validate categories are properly associated
  TestValidator.predicate(
    "category ids are properly set",
    createdArticle.categories.some((cat) => cat.id === categoryId1) &&
      createdArticle.categories.some((cat) => cat.id === categoryId2),
  );

  // Step 7: Validate timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    createdArticle.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    createdArticle.updated_at !== undefined,
  );
}
