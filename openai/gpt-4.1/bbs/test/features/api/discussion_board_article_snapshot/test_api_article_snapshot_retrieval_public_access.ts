import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate public snapshot retrieval for discussion board articles.
 *
 * This test confirms: (1) the ability to retrieve a specific article edit
 * snapshot by ID, (2) output is correct/complete, (3) endpoint is accessible
 * both with and without authentication, (4) errors for invalid/mismatched
 * snapshot/article pairs are handled and no data is leaked.
 *
 * Steps:
 *
 * 1. Generate random UUIDs for articleId/snapshotId (simulate an existing
 *    snapshot).
 * 2. Call api.functional.discussionBoard.articles.snapshots.at with those IDs.
 * 3. Validate returned snapshot: correct types, fields present, author summary
 *    logic, date format via typia.assert.
 * 4. Repeat call as 'anonymous': new connection object with empty headers.
 * 5. Compare results: must behave identically/publicly.
 * 6. Attempt retrieval with random mismatched IDs and assert error thrown.
 */
export async function test_api_article_snapshot_retrieval_public_access(
  connection: api.IConnection,
) {
  // 1. Generate random valid article and snapshot UUIDs (simulate fixtures):
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Call GET /discussionBoard/articles/{articleId}/snapshots/{snapshotId} as authenticated client
  const snapshot: IDiscussionBoardArticleSnapshot =
    await api.functional.discussionBoard.articles.snapshots.at(connection, {
      articleId,
      snapshotId,
    });
  typia.assert(snapshot);
  // 3. Check mandatory fields and author summary immutability
  TestValidator.predicate(
    "snapshot id matches format",
    typeof snapshot.id === "string" && (snapshot.id as string).length > 0,
  );
  TestValidator.predicate(
    "snapshot article_id matches format",
    typeof snapshot.article_id === "string" &&
      (snapshot.article_id as string).length > 0,
  );
  TestValidator.predicate(
    "snapshot title present",
    typeof snapshot.title === "string" && snapshot.title.length > 0,
  );
  TestValidator.predicate(
    "snapshot body present",
    typeof snapshot.body === "string" && snapshot.body.length > 0,
  );
  TestValidator.predicate(
    "snapshot created_at date-time",
    typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
  );
  // Only one of author_user or author_admin populated, rest null/undefined:
  TestValidator.predicate(
    "author context - only one summary present or both null",
    (snapshot.author_user != null && snapshot.author_admin == null) ||
      (snapshot.author_admin != null && snapshot.author_user == null) ||
      (snapshot.author_user == null && snapshot.author_admin == null),
  );
  // Author context, if present, must be correct type:
  if (snapshot.author_user != null)
    typia.assert<IDiscussionBoardUser.ISummary>(snapshot.author_user);
  if (snapshot.author_admin != null)
    typia.assert<IDiscussionBoardAdmin.ISummary>(snapshot.author_admin);

  // 4. Call same endpoint as ANONYMOUS: removes all headers to simulate no token
  const anonConn: api.IConnection = { ...connection, headers: {} };
  const snapshotAnonymous: IDiscussionBoardArticleSnapshot =
    await api.functional.discussionBoard.articles.snapshots.at(anonConn, {
      articleId,
      snapshotId,
    });
  typia.assert(snapshotAnonymous);
  TestValidator.equals(
    "snapshot anonymous == authenticated",
    snapshotAnonymous,
    snapshot,
  );

  // 5. Mismatched or invalid snapshot - should error
  const badArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const badSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "invalid articleId and snapshotId throws",
    async () => {
      await api.functional.discussionBoard.articles.snapshots.at(connection, {
        articleId: badArticleId,
        snapshotId: badSnapshotId,
      });
    },
  );
  await TestValidator.error(
    "mismatched articleId/snapshotId throws",
    async () => {
      await api.functional.discussionBoard.articles.snapshots.at(connection, {
        articleId: articleId,
        snapshotId: badSnapshotId,
      });
    },
  );
}
