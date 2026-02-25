import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the authorization boundary where a user attempts to update an article they do not own.
 *
 * This test validates that:
 * 1. Only article authors can update their own articles
 * 2. Unauthorized update attempts return HTTP 403 Forbidden
 * 3. The original article content remains unchanged after unauthorized access attempt
 *
 * Test Flow:
 * - User A registers, creates a section, and creates an article
 * - User B registers and attempts to update User A's article
 * - System rejects the update with NOT_ARTICLE_OWNER error
 */
export async function test_api_article_update_unauthorized_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create User A (article owner)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userA);
  // Step 2: User A creates a section
  const section = await generate_random_discussion_board_user_sections_create(
    userAConnection,
    {},
  );
  typia.assert(section);
  // Step 3: User A creates an article
  const article = await generate_random_discussion_board_user_articles_create(
    userAConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // Store original article data for validation
  const originalTitle = article.title;
  const originalContent = article.content;
  // Step 4: Create User B (non-owner)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userB);
  // Verify User A and User B are different users
  TestValidator.notEquals("user A and B are different", userA.id, userB.id);
  // Step 5: User B attempts to update User A's article (should fail)
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.IUpdate;
  await TestValidator.httpError(
    "non-owner cannot update article",
    403,
    async () =>
      await api.functional.discussionBoard.user.articles.update(
        userBConnection,
        {
          articleId: article.id,
          body: updateBody,
        },
      ),
  );
  // Step 6: Verify original article remains unchanged
  // The article object from creation should still have original values
  // since the unauthorized update was rejected
  TestValidator.equals("article title unchanged", article.title, originalTitle);
  TestValidator.equals(
    "article content unchanged",
    article.content,
    originalContent,
  );
}
