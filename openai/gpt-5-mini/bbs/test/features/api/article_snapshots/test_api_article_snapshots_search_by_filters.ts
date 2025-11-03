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

export async function test_api_article_snapshots_search_by_filters(
  connection: api.IConnection,
) {
  // 1) Create a member (author)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase(),
      email: memberEmail,
      password: "Password123!@#",
      href: "https://example.test/",
      referrer: "https://referrer.test/",
      ip: null,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 2) Create an article as the member
  const initialTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const initialContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: initialTitle,
        content: initialContent,
        category_slug: null,
        tag_slugs: [],
        state: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Perform multiple updates to generate snapshots
  const updates: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; ++i) {
    const updatedTitle = `${initialTitle} - edit ${i + 1} ${RandomGenerator.name(1)}`;
    const updatedContent = `${initialContent}\n\n${RandomGenerator.paragraph({ sentences: 6 })}`;
    const updated: IDiscussionBoardArticle =
      await api.functional.discussionBoard.member.articles.update(connection, {
        articleId: article.id,
        body: {
          title: updatedTitle,
          content: updatedContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    typia.assert(updated);
    updates.push(updated);
  }

  // 4) Switch to moderator: create moderator account which sets Authorization
  const modEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `mod_${RandomGenerator.alphaNumeric(6)}`,
      email: modEmail,
      password: "ModeratorPass123!",
      href: "https://moderator.example.test/",
      referrer: "https://moderator.referrer.test/",
      ip: null,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 5) As moderator, call snapshot search with multiple filters and pagination
  const searchSubstring = initialTitle.split(/\s+/).slice(0, 2).join(" ");
  const searchBody = {
    page: 1,
    limit: 10,
    sort: "-snapshot_at",
    article_id: article.id,
    author_username: member.username,
    search: searchSubstring,
    include_counts: true,
  } satisfies IDiscussionBoardArticleSnapshot.IRequest;

  const page: IPageIDiscussionBoardArticleSnapshot.ISummary =
    await api.functional.discussionBoard.moderator.articles.versions.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(page);

  // 6) Validations
  TestValidator.predicate(
    "pagination present",
    page.pagination !== undefined && page.data !== undefined,
  );
  TestValidator.equals(
    "pagination current is requested page",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    10,
  );

  // If data returned, ensure scoping and sorting
  if (page.data.length > 0) {
    // Every returned snapshot should reference the requested article id
    for (const snap of page.data) {
      typia.assert(snap);
      TestValidator.equals(
        "snapshot article id matches filter",
        snap.article.id,
        article.id,
      );
    }

    // Free-text search: when data exists, at least one item should include the substring
    const foundBySearch = page.data.some((s) => {
      const titleHas =
        s.title &&
        s.title.toLowerCase().includes(searchSubstring.toLowerCase());
      const excerptHas =
        !!s.content_excerpt &&
        s.content_excerpt.toLowerCase().includes(searchSubstring.toLowerCase());
      return titleHas || excerptHas;
    });
    TestValidator.predicate(
      "free-text search returns relevant snapshots when data present",
      foundBySearch === true,
    );

    // Sorting by snapshot_at desc: if at least two items, check order
    if (page.data.length >= 2) {
      const a = page.data[0].snapshot_at;
      const b = page.data[1].snapshot_at;
      // ISO 8601 strings are comparable lexicographically when in the same format
      TestValidator.predicate(
        "snapshot_at is desc between first two items",
        a >= b,
      );
    }
  }

  // 7) Edge cases
  // 7.1 Malformed UUID should cause an error
  await TestValidator.error("malformed article_id produces error", async () => {
    await api.functional.discussionBoard.moderator.articles.versions.index(
      connection,
      {
        body: {
          article_id: "not-a-uuid",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  });

  // 7.2 Non-existent article id: expect valid pagination envelope (possibly empty data)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentPage =
    await api.functional.discussionBoard.moderator.articles.versions.index(
      connection,
      {
        body: {
          article_id: fakeId,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(nonExistentPage);
  TestValidator.predicate(
    "non-existent article returns pagination",
    typeof nonExistentPage.pagination.current === "number",
  );

  // 7.3 Out-of-range page returns valid envelope and data array (possibly empty)
  const highPage =
    await api.functional.discussionBoard.moderator.articles.versions.index(
      connection,
      {
        body: {
          article_id: article.id,
          page: 9999,
          limit: 10,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(highPage);
  TestValidator.predicate(
    "out-of-range page returns pagination envelope",
    typeof highPage.pagination.current === "number",
  );
}
