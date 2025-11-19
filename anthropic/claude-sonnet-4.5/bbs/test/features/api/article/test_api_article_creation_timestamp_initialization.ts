import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test system-generated timestamp initialization on article creation.
 *
 * Validates that created_at, updated_at, published_at, and deleted_at
 * timestamps are correctly initialized when creating discussion board articles.
 * Verifies that published_at behavior differs based on article status (null for
 * draft, set for published), and that all timestamps use proper ISO 8601
 * format.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create article category (prerequisite for articles)
 * 3. Create member account and authenticate
 * 4. Create draft article and verify draft timestamp behavior
 * 5. Create published article and verify published timestamp behavior
 * 6. Validate ISO 8601 format and proper initialization
 */
export async function test_api_article_creation_timestamp_initialization(
  connection: api.IConnection,
) {
  const testStartTime = new Date();

  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_pass_123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for timestamp testing",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_pass_123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  const draftArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    discussion_board_article_category_id: category.id,
    status: "draft" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const draftArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: draftArticleBody,
    });
  typia.assert(draftArticle);

  const testEndTime = new Date();

  TestValidator.predicate(
    "draft article created_at is set and within test timeframe",
    () => {
      const createdAt = new Date(draftArticle.created_at);
      return createdAt >= testStartTime && createdAt <= testEndTime;
    },
  );

  TestValidator.predicate(
    "draft article updated_at is set and within test timeframe",
    () => {
      const updatedAt = new Date(draftArticle.updated_at);
      return updatedAt >= testStartTime && updatedAt <= testEndTime;
    },
  );

  TestValidator.predicate(
    "draft article created_at and updated_at are very close in time",
    () => {
      const createdAt = new Date(draftArticle.created_at).getTime();
      const updatedAt = new Date(draftArticle.updated_at).getTime();
      return Math.abs(updatedAt - createdAt) < 1000;
    },
  );

  TestValidator.equals(
    "draft article published_at is null",
    draftArticle.published_at,
    null,
  );

  TestValidator.equals(
    "draft article deleted_at is null",
    draftArticle.deleted_at,
    null,
  );

  TestValidator.predicate(
    "draft article created_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
      draftArticle.created_at,
    ),
  );

  TestValidator.predicate(
    "draft article updated_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
      draftArticle.updated_at,
    ),
  );

  const publishedArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const publishedArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: publishedArticleBody,
    });
  typia.assert(publishedArticle);

  const publishedArticleEndTime = new Date();

  TestValidator.predicate(
    "published article created_at is set and within test timeframe",
    () => {
      const createdAt = new Date(publishedArticle.created_at);
      return createdAt >= testStartTime && createdAt <= publishedArticleEndTime;
    },
  );

  TestValidator.predicate(
    "published article updated_at is set and within test timeframe",
    () => {
      const updatedAt = new Date(publishedArticle.updated_at);
      return updatedAt >= testStartTime && updatedAt <= publishedArticleEndTime;
    },
  );

  TestValidator.predicate(
    "published article created_at and updated_at are very close in time",
    () => {
      const createdAt = new Date(publishedArticle.created_at).getTime();
      const updatedAt = new Date(publishedArticle.updated_at).getTime();
      return Math.abs(updatedAt - createdAt) < 1000;
    },
  );

  TestValidator.predicate(
    "published article published_at is set and not null",
    publishedArticle.published_at !== null &&
      publishedArticle.published_at !== undefined,
  );

  if (publishedArticle.published_at) {
    typia.assertGuard(publishedArticle.published_at);

    TestValidator.predicate(
      "published article published_at is within test timeframe",
      () => {
        const publishedAt = new Date(publishedArticle.published_at!);
        return (
          publishedAt >= testStartTime && publishedAt <= publishedArticleEndTime
        );
      },
    );

    TestValidator.predicate(
      "published article published_at is valid ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
        publishedArticle.published_at,
      ),
    );

    TestValidator.predicate(
      "published article published_at and created_at are very close in time",
      () => {
        const publishedAt = new Date(publishedArticle.published_at!).getTime();
        const createdAt = new Date(publishedArticle.created_at).getTime();
        return Math.abs(publishedAt - createdAt) < 1000;
      },
    );
  }

  TestValidator.equals(
    "published article deleted_at is null",
    publishedArticle.deleted_at,
    null,
  );

  TestValidator.predicate(
    "published article created_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
      publishedArticle.created_at,
    ),
  );

  TestValidator.predicate(
    "published article updated_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
      publishedArticle.updated_at,
    ),
  );
}
