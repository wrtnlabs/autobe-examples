import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test retrieving an article snapshot that was created after article update. This validates that snapshots correctly capture historical states when articles are modified.
 *
 * Test Steps:
 * 1. Create an admin account via POST /discussionBoard/auth/admin/join
 * 2. Login as admin via POST /discussionBoard/auth/admin/login
 * 3. Create a member account via POST /discussionBoard/auth/member/join
 * 4. Login as member via POST /discussionBoard/auth/member/login
 * 5. Create an article via POST /discussionBoard/member/articles (creates first snapshot with original content)
 * 6. Update the article via PUT /discussionBoard/member/articles/{articleId} with modified title, body, and tags (creates second snapshot)
 * 7. List snapshots for the article via PATCH /discussionBoard/admin/articles/{articleId}/snapshots to obtain both snapshotIds
 * 8. Retrieve the second snapshot (after update) via GET /discussionBoard/admin/articles/{articleId}/snapshots/{snapshotId}
 *
 * Validation Points:
 * - Verify HTTP 200 status code
 * - Verify response contains IDiscussionBoardArticleSnapshot structure
 * - Verify snapshot title matches the UPDATED article title (not original)
 * - Verify snapshot body matches the UPDATED article content (not original)
 * - Verify snapshot tags field reflects the UPDATED tags
 * - Verify snapshot createdAt timestamp is after the article's original createdAt
 * - Verify snapshot updatedAt timestamp matches or is after the article update time
 * - Verify the snapshot's article reference shows updated metadata
 * - Verify fileCount and imageCount reflect the state at snapshot time
 * - Verify the snapshot represents a point-in-time capture distinct from current article state
 * - Verify article, section, and member references are properly populated with summary data
 * - Verify the snapshot is not soft-deleted (deletedAt is null)
 */
export async function test_api_article_snapshot_retrieval_after_update(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords for later login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create admin account
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  // 3. Create member account
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 4. Login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberLoginResult = await authorize_member_login(memberConnection, {
    body: {
      email: memberJoinResult.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLoginResult);
  // 5. Create article (first snapshot)
  const originalTitle = `Original Title ${RandomGenerator.alphabets(8)}`;
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        body: originalBody,
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        tags: [RandomGenerator.alphabets(5)],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Record original article creation time
  const originalCreatedAt = new Date(article.created_at);
  // 6. Update article (creates second snapshot)
  const updatedTitle = `Updated Title ${RandomGenerator.alphabets(8)}`;
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedTags = [
    RandomGenerator.alphabets(6),
    RandomGenerator.alphabets(7),
  ];
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          title: updatedTitle,
          body: updatedBody,
          tags: updatedTags,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // Record update time
  const updateTime = new Date(updatedArticle.updated_at);
  // 7. List snapshots to get snapshot IDs
  const snapshotsResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResult);
  // Must have at least 2 snapshots (one from create, one from update)
  TestValidator.predicate(
    "at least 2 snapshots",
    snapshotsResult.data.length >= 2,
  );
  // Get the most recent snapshot (should be from update)
  const latestSnapshot = snapshotsResult.data[0];
  // 8. Retrieve the latest snapshot
  const retrievedSnapshot =
    await api.functional.discussionBoard.admin.articles.snapshots.at(
      adminConnection,
      {
        articleId: article.id,
        snapshotId: latestSnapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validation Points
  // Verify snapshot contains updated content
  TestValidator.equals(
    "snapshot title matches updated title",
    retrievedSnapshot.title,
    updatedTitle,
  );
  TestValidator.equals(
    "snapshot body matches updated body",
    retrievedSnapshot.body,
    updatedBody,
  );
  // Verify tags are captured (as comma-separated string)
  TestValidator.predicate(
    "snapshot has tags",
    retrievedSnapshot.tags !== null && retrievedSnapshot.tags !== undefined && retrievedSnapshot.tags.length > 0,
  );
  // Verify snapshot is not soft-deleted
  TestValidator.predicate(
    "snapshot not soft-deleted",
    retrievedSnapshot.deletedAt === null,
  );
  // Verify snapshot timestamps are after original article creation
  TestValidator.predicate(
    "snapshot createdAt is after article creation",
    new Date(retrievedSnapshot.createdAt) >= originalCreatedAt,
  );
  TestValidator.predicate(
    "snapshot updatedAt is after article update",
    new Date(retrievedSnapshot.updatedAt) >= updateTime,
  );
  // Verify article reference exists and matches
  TestValidator.equals(
    "article ID matches",
    retrievedSnapshot.article.id,
    article.id,
  );
  // Verify section reference exists
  TestValidator.predicate(
    "section reference exists",
    retrievedSnapshot.section !== null,
  );
  // Verify member reference exists and matches
  TestValidator.equals(
    "member ID matches",
    retrievedSnapshot.member.id,
    memberLoginResult.id,
  );
  // Verify file and image counts are non-negative
  TestValidator.predicate(
    "fileCount is non-negative",
    retrievedSnapshot.fileCount >= 0,
  );
  TestValidator.predicate(
    "imageCount is non-negative",
    retrievedSnapshot.imageCount >= 0,
  );
}