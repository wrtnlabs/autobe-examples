import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test comment update timestamp tracking functionality.
 *
 * This test verifies that the comment update operation correctly manages timestamps:
 * - created_at remains immutable after initial creation
 * - updated_at changes on each content modification
 * - Content updates are properly tracked with new timestamps
 * - Author and article associations remain unchanged
 *
 * Test Flow:
 * 1. Admin creates section for article organization
 * 2. Member creates article in the section
 * 3. Member creates initial comment with known timestamps
 * 4. Member updates comment content multiple times
 * 5. Validate timestamp behavior across all updates
 */
export async function test_api_comment_update_timestamp_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup - Create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(section);
  // 2. Member Setup - Register and create article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 6,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 3. Create Initial Comment
  const initialComment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(initialComment);
  // Record initial timestamps
  const initialCreatedAt = initialComment.created_at;
  const initialUpdatedAt = initialComment.updated_at;
  // Validate initial state
  TestValidator.equals(
    "initial created_at and updated_at should be equal or close",
    initialCreatedAt <= initialUpdatedAt,
    true,
  );
  TestValidator.notEquals("comment has valid ID", initialComment.id, "");
  // 4. First Update
  const firstUpdateContent = RandomGenerator.paragraph({ sentences: 4 });
  const firstUpdatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: firstUpdateContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(firstUpdatedComment);
  // Validate first update
  TestValidator.equals(
    "created_at unchanged after first update",
    firstUpdatedComment.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed after first update",
    firstUpdatedComment.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals(
    "content matches first update",
    firstUpdatedComment.content,
    firstUpdateContent,
  );
  TestValidator.equals(
    "author unchanged after update",
    firstUpdatedComment.author.id,
    initialComment.author.id,
  );
  TestValidator.equals(
    "article unchanged after update",
    firstUpdatedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "deleted_at remains null",
    firstUpdatedComment.deleted_at,
    null,
  );
  // 5. Second Update
  const secondUpdateContent = RandomGenerator.content({ paragraphs: 1 });
  const secondUpdatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: secondUpdateContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(secondUpdatedComment);
  // Validate second update
  TestValidator.equals(
    "created_at unchanged after second update",
    secondUpdatedComment.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed after second update",
    secondUpdatedComment.updated_at,
    firstUpdatedComment.updated_at,
  );
  TestValidator.equals(
    "content matches second update",
    secondUpdatedComment.content,
    secondUpdateContent,
  );
  TestValidator.predicate(
    "updated_at is newer than first update",
    secondUpdatedComment.updated_at > firstUpdatedComment.updated_at,
  );
  // 6. Third Update
  const thirdUpdateContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const thirdUpdatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: thirdUpdateContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(thirdUpdatedComment);
  // Validate third update
  TestValidator.equals(
    "created_at unchanged after third update",
    thirdUpdatedComment.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed after third update",
    thirdUpdatedComment.updated_at,
    secondUpdatedComment.updated_at,
  );
  TestValidator.equals(
    "content matches third update",
    thirdUpdatedComment.content,
    thirdUpdateContent,
  );
  TestValidator.predicate(
    "updated_at is newer than second update",
    thirdUpdatedComment.updated_at > secondUpdatedComment.updated_at,
  );
  // 7. Final Validation - Timestamp Progression
  const timestamps = [
    initialUpdatedAt,
    firstUpdatedComment.updated_at,
    secondUpdatedComment.updated_at,
    thirdUpdatedComment.updated_at,
  ];
  TestValidator.predicate(
    "timestamps are in ascending order",
    timestamps.every((ts, i) => i === 0 || ts > timestamps[i - 1]),
  );
  TestValidator.predicate(
    "created_at remained constant throughout all updates",
    [
      initialComment,
      firstUpdatedComment,
      secondUpdatedComment,
      thirdUpdatedComment,
    ].every((c) => c.created_at === initialCreatedAt),
  );
  // 8. Validate author and article consistency across all updates
  const authorId = initialComment.author.id;
  const articleId = article.id;
  [firstUpdatedComment, secondUpdatedComment, thirdUpdatedComment].forEach(
    (comment, index) => {
      TestValidator.equals(
        `author unchanged in update ${index + 1}`,
        comment.author.id,
        authorId,
      );
      TestValidator.equals(
        `article unchanged in update ${index + 1}`,
        comment.article.id,
        articleId,
      );
    },
  );
}
