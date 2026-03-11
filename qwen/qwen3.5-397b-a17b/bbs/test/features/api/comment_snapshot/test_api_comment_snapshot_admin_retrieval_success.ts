import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
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
 * Test that an administrator can successfully retrieve the edit history snapshots for a comment.
 *
 * This test validates the complete workflow:
 * 1. Administrator joins and creates a section
 * 2. Member joins and creates an article in that section
 * 3. Member posts a comment on the article
 * 4. Member edits the comment multiple times to generate snapshot history
 * 5. Administrator retrieves the snapshot history via admin endpoint
 * 6. Validates snapshots are in chronological order with correct content and metadata
 */
export async function test_api_comment_snapshot_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member setup - join and create article
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Member creates initial comment
  const initialContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: initialContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Member edits comment multiple times to generate snapshots
  const editContents = ArrayUtil.repeat(3, (index) =>
    RandomGenerator.paragraph({
      sentences: 2 + index,
      wordMin: 5,
      wordMax: 10,
    }),
  );
  const updatedComments: IDiscussionBoardComment[] = [];
  for (const content of editContents) {
    const updated =
      await api.functional.discussionBoard.member.articles.comments.update(
        memberConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: content,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    typia.assert(updated);
    updatedComments.push(updated);
  }
  // 5. Administrator retrieves snapshot history
  const snapshotResponse =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    snapshotResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    snapshotResponse.pagination.limit > 0,
  );
  TestValidator.predicate("has snapshots", snapshotResponse.data.length > 0);
  TestValidator.equals(
    "snapshot count matches edits",
    snapshotResponse.data.length,
    editContents.length,
  );
  // 7. Validate snapshots are in chronological order and contain correct content
  for (let i = 0; i < snapshotResponse.data.length; i++) {
    const snapshot = snapshotResponse.data[i];
    typia.assert(snapshot);
    // Validate snapshot has required fields
    TestValidator.predicate("has snapshot id", snapshot.id !== undefined);
    TestValidator.predicate(
      "has snapshot content",
      snapshot.content !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate("has author", snapshot.author !== undefined);
    TestValidator.predicate("has article", snapshot.article !== undefined);
    // Validate author information
    TestValidator.equals(
      "author id matches member",
      snapshot.author.id,
      memberAuth.id,
    );
    TestValidator.predicate(
      "author has display name",
      snapshot.author.display_name !== undefined,
    );
    // Validate article information
    TestValidator.equals("article id matches", snapshot.article.id, article.id);
    TestValidator.equals(
      "article title matches",
      snapshot.article.title,
      article.title,
    );
    // Validate content matches one of the edit contents (snapshots capture each edit)
    const foundContent = editContents.some(
      (editContent) => snapshot.content === editContent,
    );
    TestValidator.predicate("snapshot content matches an edit", foundContent);
  }
  // 8. Validate chronological order by created_at timestamps
  for (let i = 1; i < snapshotResponse.data.length; i++) {
    const prevSnapshot = snapshotResponse.data[i - 1];
    const currSnapshot = snapshotResponse.data[i];
    const prevTime = new Date(prevSnapshot.created_at).getTime();
    const currTime = new Date(currSnapshot.created_at).getTime();
    TestValidator.predicate(
      "snapshots in chronological order",
      prevTime <= currTime,
    );
  }
}
