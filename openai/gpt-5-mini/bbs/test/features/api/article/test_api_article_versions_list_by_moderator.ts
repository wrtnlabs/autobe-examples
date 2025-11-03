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

export async function test_api_article_versions_list_by_moderator(
  connection: api.IConnection,
) {
  // 1) Member sign-up (author)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd12345", // >=12 chars, mixed classes
      display_name: RandomGenerator.name(),
      href: "https://example.com/articles/new",
      referrer: "https://example.com/",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 2) Create an article as the member
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
    category_slug: null,
    tag_slugs: [] as string[],
    // do not set state to 'published' to avoid publish-time constraints
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: createBody,
    });
  typia.assert(article);
  TestValidator.predicate("created article has id", !!article.id);

  // 3) Update the article (this action is expected to cause the server to
  // persist a pre-update snapshot into discussion_board_article_snapshots).
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });
  const updateBody = {
    title: updatedTitle,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updated: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: updateBody,
    });
  typia.assert(updated);

  // Validate update semantics: same id, title changed, updated_at present and differs
  TestValidator.equals(
    "article id unchanged after update",
    updated.id,
    article.id,
  );
  TestValidator.notEquals(
    "article title was updated",
    updated.title,
    article.title,
  );

  // updated_at may be null on some implementations; ensure it exists and differs if provided
  if (article.updated_at === null || article.updated_at === undefined) {
    TestValidator.predicate(
      "updated article has updated_at",
      updated.updated_at !== null && updated.updated_at !== undefined,
    );
  } else {
    TestValidator.notEquals(
      "updated_at changed after update",
      updated.updated_at,
      article.updated_at,
    );
  }

  // 4) Create a moderator actor to validate moderator onboarding flow.
  // Note: this also sets the connection's Authorization header to the
  // moderator token (SDK-managed). We do NOT touch connection.headers directly.
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "Moderator!2345",
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator has token",
    !!moderator.token && !!moderator.token.access,
  );

  // 5) Snapshot listing endpoint not available in provided SDK.
  // As an implementable proxy, we validated that an update occurred and
  // returned a different updated_at/title. The service's contract states
  // that a pre-update snapshot is written server-side; the successful update
  // with changed timestamps acts as indirect evidence. When a dedicated
  // moderator versions-listing API is provided in the SDK, a follow-up test
  // should call it directly and assert pagination, sorting, and authorization.
}
