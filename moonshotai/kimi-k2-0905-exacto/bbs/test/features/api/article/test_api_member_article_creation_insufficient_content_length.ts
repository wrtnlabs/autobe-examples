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

export async function test_api_member_article_creation_insufficient_content_length(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to establish authentication context
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Attempt to create an article with insufficient content length (below 10 characters)
  const insufficientContent = "Short"; // Only 5 characters, below the 10-character minimum

  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: insufficientContent,
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  // Step 3: Verify the system rejects the article due to insufficient content length
  await TestValidator.error(
    "article creation should fail with insufficient content length",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: createArticleBody,
        },
      );
    },
  );

  // Step 4: Create a valid article with sufficient content length to confirm the system works correctly
  const sufficientContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const validArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: sufficientContent,
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const validArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: validArticleBody,
    });
  typia.assert(validArticle);

  // Step 5: Validate that the valid article was created successfully
  TestValidator.predicate(
    "valid article should be created successfully",
    validArticle.content.length >= 10,
  );
  TestValidator.equals(
    "article title matches input",
    validArticle.title,
    validArticleBody.title,
  );
}
