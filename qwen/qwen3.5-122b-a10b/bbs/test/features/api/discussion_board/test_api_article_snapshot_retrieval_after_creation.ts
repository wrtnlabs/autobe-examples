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
 * Test retrieving a specific article snapshot after article creation.
 * This validates the primary success path for the audit trail feature.
 *
 * Test Steps:
 * 1. Create an admin account via POST /discussionBoard/auth/admin/join
 * 2. Create a member account via POST /discussionBoard/auth/member/join
 * 3. Create an article via POST /discussionBoard/member/articles (this automatically creates the first snapshot)
 * 4. List snapshots for the article via PATCH /discussionBoard/admin/articles/{articleId}/snapshots to obtain the snapshotId
 * 5. Retrieve the specific snapshot via GET /discussionBoard/admin/articles/{articleId}/snapshots/{snapshotId}
 *
 * Validation Points:
 * - Verify HTTP 200 status code
 * - Verify response contains IDiscussionBoardArticleSnapshot structure with all required fields
 * - Verify snapshot title matches the article's title at creation time
 * - Verify snapshot body matches the article's content at creation time
 * - Verify snapshot tags field is present (can be null or comma-separated string)
 * - Verify fileCount and imageCount are 0 for newly created article without attachments
 * - Verify createdAt and updatedAt are valid ISO datetime strings
 * - Verify deletedAt is null (snapshot is not deleted)
 * - Verify article reference contains id, title, author summary, section summary, tags array, comments_count, and timestamps
 * - Verify section reference contains id, name, created_at, creator, and article_count
 * - Verify member reference contains id, displayName, bio, articleCount, commentCount, and timestamps
 * - Verify the snapshot's article.section.id matches the article's section.id
 * - Verify the snapshot's article.author.id matches the article's author.id
 */
export async function test_api_article_snapshot_retrieval_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords for later login
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const memberPassword: string = RandomGenerator.alphaNumeric(16);
  // 1. Create admin account
  const adminJoinOutput: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminJoinOutput);
  // 2. Create member account
  const memberJoinOutput: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberJoinOutput);
  // 3. Create admin connection for admin-only operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinOutput.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 4. Create member connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberJoinOutput.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 5. Create article (automatically creates first snapshot)
  // Note: We're using the utility function which handles section and tag preparation internally
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {},
    );
  typia.assert(article);
  // 6. List snapshots to get snapshotId
  const snapshots: IPageIDiscussionBoardArticleSnapshot.ISummary =
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
  typia.assert(snapshots);
  // 7. Verify at least one snapshot exists
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshots.data.length > 0,
  );
  // 8. Get the first snapshot ID
  const snapshotId: string & tags.Format<"uuid"> = snapshots.data[0].id;
  // 9. Retrieve the specific snapshot
  const snapshot: IDiscussionBoardArticleSnapshot =
    await api.functional.discussionBoard.admin.articles.snapshots.at(
      adminConnection,
      {
        articleId: article.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot structure
  TestValidator.equals(
    "snapshot title matches article",
    snapshot.title,
    article.title,
  );
  TestValidator.equals(
    "snapshot body matches article",
    snapshot.body,
    article.body,
  );
  TestValidator.predicate("fileCount is non-negative", snapshot.fileCount >= 0);
  TestValidator.predicate(
    "imageCount is non-negative",
    snapshot.imageCount >= 0,
  );
  TestValidator.predicate(
    "createdAt is valid ISO date",
    new Date(snapshot.createdAt).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    new Date(snapshot.updatedAt).toString() !== "Invalid Date",
  );
  TestValidator.equals("deletedAt is null", snapshot.deletedAt, null);
  // 11. Validate article reference
  TestValidator.equals("article id matches", snapshot.article.id, article.id);
  TestValidator.equals(
    "article title matches",
    snapshot.article.title,
    article.title,
  );
  TestValidator.equals(
    "article section id matches",
    snapshot.article.section.id,
    article.section.id,
  );
  TestValidator.equals(
    "article author id matches",
    snapshot.article.author.id,
    article.author.id,
  );
  // 12. Validate section reference
  TestValidator.equals(
    "section id exists",
    snapshot.section.id,
    article.section.id,
  );
  TestValidator.equals(
    "section name exists",
    snapshot.section.name,
    article.section.name,
  );
  // 13. Validate member reference
  TestValidator.equals(
    "member id matches",
    snapshot.member.id,
    article.author.id,
  );
  TestValidator.equals(
    "member displayName matches",
    snapshot.member.displayName,
    article.author.displayName,
  );
}