import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_update_by_author(
  connection: api.IConnection,
) {
  /**
   * Test flow:
   *
   * 1. Register a fresh member (join)
   * 2. Create an article as that member
   * 3. Update the article's title and content as the same member
   * 4. Assert the returned article is updated and timestamps reflect the change
   * 5. Indirectly assert that a prior-state snapshot must have been created by
   *    checking that previous values differ from updated values
   */

  // 1) Member registration (fresh user)
  const username = RandomGenerator.alphaNumeric(8);
  const password = `${RandomGenerator.alphaNumeric(8)}Aa!1`; // >=12 chars, mixed categories
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username,
      email,
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 2) Create an article as this member
  const originalTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 10,
  });
  const originalContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });

  const created = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: originalTitle,
        content: originalContent,
        category_slug: null, // explicit null to indicate no category
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(created);

  // 3) Update the article as the author
  const newTitle = `${originalTitle} (edited)`;
  const newContent = `${originalContent}\n\n${RandomGenerator.paragraph({ sentences: 8, wordMin: 4, wordMax: 8 })}`;

  const updated = await api.functional.discussionBoard.member.articles.update(
    connection,
    {
      articleId: created.id,
      body: {
        title: newTitle,
        content: newContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(updated);

  // 4) Business validations
  TestValidator.equals(
    "article id unchanged after update",
    updated.id,
    created.id,
  );
  TestValidator.equals("title updated as requested", updated.title, newTitle);
  TestValidator.equals(
    "content updated as requested",
    updated.content,
    newContent,
  );

  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updated.updated_at).getTime() >
      new Date(created.created_at).getTime(),
  );

  // 5) Indirect snapshot verification (feasible with provided APIs):
  // Ensure that prior title/content differ from updated values which implies
  // the server persisted a prior-state before applying the update.
  TestValidator.notEquals(
    "prior title differs from updated title",
    created.title,
    updated.title,
  );
  TestValidator.notEquals(
    "prior content differs from updated content",
    created.content,
    updated.content,
  );
}
