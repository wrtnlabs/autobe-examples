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
 * Validate that an article author can atomically replace tag assignments on
 * their article using the replacement payload form of
 * IDiscussionBoardArticleTag.IRequest (tag_slugs), and that the system records
 * the change with proper audit attribution.
 *
 * Steps:
 *
 * 1. Moderator signs up (creates moderator account) and receives tokens.
 * 2. Moderator creates two tags and we capture their ids and slugs.
 * 3. Member (author) signs up and receives tokens.
 * 4. Member creates an article and we capture article.id.
 * 5. Member calls PATCH /discussionBoard/member/articles/{articleId}/tags with {
 *    tag_slugs: [slug1, slug2] } to replace assignments atomically.
 * 6. Validate the returned assignment summaries: exact id order, no duplicates,
 *    and created_by refers to the member author for audit.
 */
export async function test_api_article_tag_assignments_update_by_author_success(
  connection: api.IConnection,
) {
  // 1. Moderator signs up
  const moderatorEmail =
    `${RandomGenerator.name(1).replace(/\s+/g, "")}@example.com`.toLowerCase();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase(),
        email: moderatorEmail,
        password: "StrongP@ssw0rd!",
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/moderator/signup",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Moderator creates two tags
  const makeSlug = (seed: string) =>
    seed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

  const raw1 = RandomGenerator.paragraph({ sentences: 3 });
  const raw2 = RandomGenerator.paragraph({ sentences: 3 });
  const tag1Body = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: makeSlug(raw1),
    description: null,
  } satisfies IDiscussionBoardTag.ICreate;
  const tag2Body = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: makeSlug(raw2),
    description: null,
  } satisfies IDiscussionBoardTag.ICreate;

  const tag1: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: tag1Body,
    });
  typia.assert(tag1);

  const tag2: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: tag2Body,
    });
  typia.assert(tag2);

  TestValidator.predicate(
    "created tags are distinct",
    tag1.id !== tag2.id && tag1.slug !== tag2.slug,
  );

  // 3. Member (author) signs up
  const memberEmail =
    `${RandomGenerator.name(1).replace(/\s+/g, "")}@example.com`.toLowerCase();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase(),
        email: memberEmail,
        password: "AuthorP@ssw0rd!",
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/member/signup",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 4. Member creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_slug: null,
        tag_slugs: undefined,
        state: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article created has id",
    typeof article.id === "string" && article.id.length > 0,
  );

  // 5. Author replaces tag assignments atomically using tag slugs
  const updateBody = {
    tag_slugs: [tag1.slug, tag2.slug],
    if_match_version: null,
  } satisfies IDiscussionBoardArticleTag.IRequest;

  const updated: IPageIDiscussionBoardArticleTag.ISummary =
    await api.functional.discussionBoard.member.articles.tags.update(
      connection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 6. Validations
  const assignedIds: string[] = updated.data.map((s) => s.tag.id);

  // Exact order and ids match the created tags
  TestValidator.equals(
    "assigned tag ids match created tags in order",
    assignedIds,
    [tag1.id, tag2.id],
  );

  // No duplicates
  TestValidator.predicate(
    "no duplicate tag assignments",
    new Set(assignedIds).size === assignedIds.length,
  );

  // Audit: each assignment should record the creating member as the actor
  TestValidator.predicate(
    "assignments recorded as created by the author",
    updated.data.every(
      (s) =>
        s.created_by !== null &&
        s.created_by !== undefined &&
        s.created_by.id === member.id,
    ),
  );
}
