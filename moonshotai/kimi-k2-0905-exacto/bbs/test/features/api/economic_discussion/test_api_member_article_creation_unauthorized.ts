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
 * Test article creation fails without proper authentication.
 *
 * This test validates that the economic discussion article creation endpoint
 * properly rejects unauthenticated requests. The test attempts to create an
 * article without establishing member authentication context through the
 * standard authentication process.
 *
 * Test Strategy:
 *
 * 1. Generate valid article creation data
 * 2. Attempt to create article without authentication
 * 3. Verify that the API call fails with an authentication error
 *
 * The test ensures that members must be authenticated before creating articles,
 * supporting the platform's security model for economic and political
 * discussions where content attribution and accountability are crucial.
 */
export async function test_api_member_article_creation_unauthorized(
  connection: api.IConnection,
) {
  // Create valid article creation request data
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 3 }),
    category_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  // Attempt to create article without authentication
  // This should fail as the endpoint requires authentication
  await TestValidator.error(
    "article creation requires authentication",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: articleData,
        },
      );
    },
  );
}
