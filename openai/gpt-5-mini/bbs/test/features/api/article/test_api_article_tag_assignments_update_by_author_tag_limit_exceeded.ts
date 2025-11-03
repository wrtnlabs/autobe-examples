import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";

/**
 * Validate tag-limit enforcement when an article author attempts to replace an
 * article's tag assignments with a list that exceeds the per-article limit.
 *
 * Scenario:
 *
 * 1. Moderator signs up and creates more tags than the per-article maximum (DTO
 *    indicates max 10 tags per article).
 * 2. Member (article author) signs up and creates an article.
 * 3. As the author, attempt to replace the article's tags with an over-limit list
 *    and assert the request fails at runtime.
 * 4. Perform a subsequent valid replacement (<= 10 tags) and assert success and
 *    that the returned assignments match the requested count.
 *
 * Note: The SDK does not include an explicit GET/article retrieval operation,
 * so atomicity is validated indirectly by ensuring the invalid request fails
 * and a subsequent valid update succeeds and returns expected results.
 */
export async function test_api_article_tag_assignments_update_by_author_tag_limit_exceeded(
  connection: api.IConnection,
) {
  // 1) Moderator signs up (will set connection Authorization to moderator token)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: moderatorEmail,
      password: "StrongModeratorPass123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2) Create multiple tags (exceed the per-article limit of 10)
  // Use a timestamp suffix to reduce collision risk in shared environments.
  const tagCount = 12; // > 10 to ensure over-limit
  const timestamp = Date.now();
  const createdTags: IDiscussionBoardTag[] = await ArrayUtil.asyncRepeat(
    tagCount,
    async (idx) => {
      const name = RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      });
      // slug must match pattern ^[a-z0-9]+(?:[-_][a-z0-9]+)*$
      const slug = `${RandomGenerator.alphaNumeric(6).toLowerCase()}-${timestamp}-${idx}`;
      const tag = await api.functional.discussionBoard.moderator.tags.create(
        connection,
        {
          body: {
            name,
            slug,
            description: null,
          } satisfies IDiscussionBoardTag.ICreate,
        },
      );
      typia.assert(tag);
      return tag;
    },
  );

  // 3) Member (article author) signs up — this will switch connection to member token
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: "StrongMemberPass123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 4) Member creates an article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Keep original snapshot (empty array when none)
  const originalTags = article.tags ?? [];

  // 5) Attempt to replace with an over-limit list and assert it fails
  const overLimitSlugs = createdTags.map((t) => t.slug); // length = 12
  await TestValidator.error(
    "over-limit tag replacement should be rejected by server",
    async () => {
      await api.functional.discussionBoard.member.articles.tags.update(
        connection,
        {
          articleId: article.id,
          body: {
            tag_slugs: overLimitSlugs,
          } satisfies IDiscussionBoardArticleTag.IRequest,
        },
      );
    },
  );

  // 6) Perform a valid update (<= 10 tags) to verify assignments can be set
  //    Because the SDK lacks a GET article endpoint, we confirm the system
  //    accepted a valid replacement and returned the updated assignment page.
  const validSlugs = overLimitSlugs.slice(0, 3);
  const result: IPageIDiscussionBoardArticleTag.ISummary =
    await api.functional.discussionBoard.member.articles.tags.update(
      connection,
      {
        articleId: article.id,
        body: {
          tag_slugs: validSlugs,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(result);

  // Validate the returned assignment page contains the expected number of tags
  TestValidator.equals(
    "valid update returns requested number of tag assignments",
    result.data.length,
    validSlugs.length,
  );

  // Future-proof comment: if the SDK gains a GET/article endpoint, add a
  // re-fetch here and assert `article.tags` equals `originalTags` after the
  // failed over-limit operation to prove full atomicity.
}
