import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleVersion";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test proper error handling when attempting to retrieve a version ID that
 * doesn't belong to the specified article. Validates that the API correctly
 * distinguishes between article-specific versions and prevents cross-article
 * version access, ensuring proper access controls in the versioning system and
 * preventing unauthorized historical content viewing.
 */
export async function test_api_article_version_retrieval_version_mismatch(
  connection: api.IConnection,
) {
  // Step 1: Create member account for article and version testing
  const createMemberBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: createMemberBody,
  });
  typia.assert(member);

  // Step 2: Create first article to generate version history
  const createArticle1Body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article1 =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: createArticle1Body,
    });
  typia.assert(article1);

  // Step 3: Create second article to generate separate version history for cross-access testing
  const createArticle2Body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article2 =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: createArticle2Body,
    });
  typia.assert(article2);

  // Create a version ID that we know exists (simulating a valid version ID from article1)
  const versionIdFromArticle1 = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Attempt to retrieve a version that belongs to article1 but using article2's ID
  await TestValidator.error(
    "should prevent cross-article version access",
    async () => {
      await api.functional.economicDiscussion.member.articles.versions.at(
        connection,
        {
          articleId: article2.id,
          versionId: versionIdFromArticle1,
        },
      );
    },
  );
}
