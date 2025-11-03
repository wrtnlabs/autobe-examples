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

/**
 * Validate that soft-deleting a tag is blocked when the tag has active
 * assignments to articles.
 *
 * Business context:
 *
 * - Moderators manage tags. Tags are assignable to articles by members.
 * - When an article is assigned a tag, policy prevents soft-deleting that tag
 *   while active assignments exist. The system should block deletion and
 *   preserve the tag (deleted_at remains null and is_active remains
 *   unchanged).
 *
 * Test steps:
 *
 * 1. Moderator A signs up (moderator token set on connection).
 * 2. Moderator A creates a tag with a unique slug.
 * 3. Member signs up and creates an article.
 * 4. Member assigns the created tag to the article.
 * 5. Moderator B signs up and attempts to delete the tag.
 * 6. Deletion should be blocked (an error is thrown). Verify by attempting to
 *    create a tag with the same slug — that should fail, proving the tag still
 *    exists.
 */
export async function test_api_tag_soft_delete_blocked_when_assigned(
  connection: api.IConnection,
) {
  // 1. Moderator A signs up
  const moderatorAUsername = RandomGenerator.alphaNumeric(8);
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAPassword = `Aa1!${RandomGenerator.alphaNumeric(12)}`; // >=12 chars with mixed content

  const moderatorA: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorAUsername,
        email: moderatorAEmail,
        password: moderatorAPassword,
        href: "http://example.com/",
        referrer: "http://example.com/ref",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorA);

  // 2. Moderator A creates a new tag
  const tagSlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const tagName = RandomGenerator.paragraph({ sentences: 3 });

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagName,
        slug: tagSlug,
        description: "E2E test tag",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);

  // 3. Member signs up
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = `Mm1!${RandomGenerator.alphaNumeric(12)}`;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: "http://example.com/",
        referrer: "http://example.com/ref",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 4. Member creates an article
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleBody = RandomGenerator.content({ paragraphs: 2 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 5. Member assigns the created tag to the article
  const assignment: IDiscussionBoardArticleTag =
    await api.functional.discussionBoard.member.articles.tags.create(
      connection,
      {
        articleId: article.id,
        body: {
          tagSlug: createdTag.slug,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(assignment);

  // Validate assignment references
  TestValidator.equals(
    "assignment references created article",
    assignment.article.id,
    article.id,
  );
  TestValidator.equals(
    "assignment references created tag slug",
    assignment.tag.slug,
    createdTag.slug,
  );

  // 6. Moderator B signs up (to perform the deletion attempt)
  const moderatorBUsername = RandomGenerator.alphaNumeric(8);
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();
  const moderatorBPassword = `Bb1!${RandomGenerator.alphaNumeric(12)}`;

  const moderatorB: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorBUsername,
        email: moderatorBEmail,
        password: moderatorBPassword,
        href: "http://example.com/",
        referrer: "http://example.com/ref",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorB);

  // 7. Moderator B attempts to soft-delete the tag — expect an error because assignment exists
  await TestValidator.error(
    "deletion should be blocked when tag has active article assignments",
    async () => {
      await api.functional.discussionBoard.moderator.tags.erase(connection, {
        tagSlug: createdTag.slug,
      });
    },
  );

  // 8. Verify the tag still persists by attempting to create a tag with the same slug — it should fail (duplicate)
  await TestValidator.error(
    "duplicate tag creation should fail after blocked deletion",
    async () => {
      await api.functional.discussionBoard.moderator.tags.create(connection, {
        body: {
          name: `${tagName}-dup`,
          slug: createdTag.slug,
        } satisfies IDiscussionBoardTag.ICreate,
      });
    },
  );
}
