import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";

/**
 * Validate moderator can list historical snapshots for a specific article.
 *
 * Business context:
 *
 * - Moderators must be able to review past states of an article for audit and
 *   moderation decisions. Snapshots are recorded when an article is updated.
 *
 * Test steps:
 *
 * 1. Moderator signs up (auth/moderator/join).
 * 2. Member signs up (auth/member/join).
 * 3. Member creates an article (discussionBoard/member/articles POST).
 * 4. Member performs multiple updates (PUT) to generate snapshots.
 * 5. Moderator calls PATCH /discussionBoard/moderator/articles/:articleId/versions
 *    with combinations of pagination, state filter, snapshot_at range, and
 *    free-text search. Validate sorting and pagination semantics.
 * 6. Validate malformed articleId yields error and non-existent articleId results
 *    either in empty page or error (both acceptable per API policy).
 */
export async function test_api_article_snapshots_list_for_article_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator signs up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: moderatorEmail,
      password: "Str0ngP@ssw0rd!",
      href: "http://example.com/moderator",
      referrer: "http://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Member signs up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: "MemBerStr0ngP@ss!",
      href: "http://example.com/join",
      referrer: "http://example.com",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 3. Member creates an article
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const initialContent = RandomGenerator.content({ paragraphs: 2 });
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: initialTitle,
        content: initialContent,
        // keep as draft to avoid publication constraints
        state: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 4. Apply multiple updates to generate snapshots
  // We'll perform 3 sequential updates with distinct titles/contents/states
  await ArrayUtil.asyncRepeat(3, async (idx) => {
    const updatedTitle = `Edit ${idx + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`;
    const updatedContent = RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    });
    const updateBody = {
      title: updatedTitle,
      content: updatedContent,
      state: idx === 2 ? "published" : undefined, // publish on last edit
    } satisfies IDiscussionBoardArticle.IUpdate;

    const updated = await api.functional.discussionBoard.member.articles.update(
      connection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
    typia.assert(updated);
  });

  // Define time range that covers the recent operations
  const snapshotFrom = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  const snapshotTo = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour in future

  // 5. As moderator: list snapshots for the article with pagination, search, state filter
  // Search for a keyword included in one of the edit titles
  const sampleSearchKeyword = "Edit";

  const listing =
    await api.functional.discussionBoard.moderator.articles.versions.indexForArticle(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-snapshot_at",
          search: sampleSearchKeyword,
          state: undefined, // no state filter here; test combined filters later
          snapshot_from: snapshotFrom,
          snapshot_to: snapshotTo,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(listing);

  // Core validations
  TestValidator.predicate(
    "returned page has pagination object",
    listing.pagination !== undefined,
  );
  TestValidator.predicate(
    "all snapshots belong to requested article",
    listing.data.every((s) => s.article.id === article.id),
  );

  // Check snapshot_at range
  TestValidator.predicate(
    "all snapshots snapshot_at within requested time range",
    listing.data.every(
      (s) => s.snapshot_at >= snapshotFrom && s.snapshot_at <= snapshotTo,
    ),
  );

  // If multiple snapshots, ensure sorted by snapshot_at descending
  if (listing.data.length >= 2) {
    TestValidator.predicate(
      "snapshots sorted by snapshot_at descending",
      listing.data.every(
        (v, i, arr) => i === 0 || arr[i - 1].snapshot_at >= v.snapshot_at,
      ),
    );
  }

  // 6. Combined filter: state + text search
  const combined =
    await api.functional.discussionBoard.moderator.articles.versions.indexForArticle(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-snapshot_at",
          search: "Edit",
          state: "published",
          snapshot_from: snapshotFrom,
          snapshot_to: snapshotTo,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(combined);

  // When filtering by state 'published', every returned snapshot.state must equal 'published'
  TestValidator.predicate(
    "combined filter: snapshots match requested state when present",
    combined.data.every((s) => s.state === "published"),
  );

  // 7. Malformed articleId (invalid UUID) should throw
  await TestValidator.error(
    "malformed articleId should cause error",
    async () => {
      await api.functional.discussionBoard.moderator.articles.versions.indexForArticle(
        connection,
        {
          articleId: "not-a-uuid",
          body: { page: 1 } satisfies IDiscussionBoardArticleSnapshot.IRequest,
        },
      );
    },
  );

  // 8. Non-existent articleId (well-formed UUID)
  try {
    const nonExistentId = typia.random<string & tags.Format<"uuid">>();
    const resp =
      await api.functional.discussionBoard.moderator.articles.versions.indexForArticle(
        connection,
        {
          articleId: nonExistentId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardArticleSnapshot.IRequest,
        },
      );
    typia.assert(resp);
    // Accept either empty data or a policy-defined response; ensure empty when provided
    TestValidator.predicate(
      "non-existent article returns empty data if successful",
      resp.data.length === 0,
    );
  } catch {
    // Error is acceptable per API policy (404 or similar). No further assertions required.
  }

  // 9. Out-of-range page should yield empty data
  const outOfRange =
    await api.functional.discussionBoard.moderator.articles.versions.indexForArticle(
      connection,
      {
        articleId: article.id,
        body: {
          page: 99999,
          limit: 10,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(outOfRange);
  TestValidator.predicate(
    "out-of-range page returns empty data",
    outOfRange.data.length === 0,
  );
}
