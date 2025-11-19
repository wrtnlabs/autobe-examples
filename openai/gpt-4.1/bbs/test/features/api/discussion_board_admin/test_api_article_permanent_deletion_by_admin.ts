import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Permanently deletes a discussion board article via the admin-only endpoint.
 *
 * 1. Register a new admin via /auth/admin/join with required session context
 *    fields.
 * 2. Use the returned authorized session to invoke delete
 *    /discussionBoard/admin/articles/{articleId}, supplying a random UUID as
 *    the articleId (simulating a target article, since article creation/fetch
 *    endpoints are not present).
 * 3. The deletion request must not throw errors for authorized admin.
 * 4. Simulate attempted post-deletion retrieval (if an endpoint were present),
 *    confirming the resource is considered deleted/unavailable (no NotFound
 *    fetch possible, so absence is implied).
 * 5. Ensure no orphaned data/artifacts remain by implication, since relations
 *    cannot be tested via available APIs.
 * 6. Attempt to call the privileged erase endpoint with a fresh unauthenticated
 *    (or regular user) connection and verify it fails as forbidden for
 *    non-admin actors.
 * 7. Ensure compliance with moderation/audit requirements: admin with proper join
 *    credentials can invoke, others cannot.
 */
export async function test_api_article_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin with all required fields.
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) satisfies string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://admin-join.test/registration", // realistic uri
    referrer: "https://landing.example.com/board",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Simulate target articleId (no create endpoint; use random UUID).
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // 3. Admin attempts deletion - must succeed (no output on success).
  await api.functional.discussionBoard.admin.articles.erase(connection, {
    articleId,
  });

  // 4. (Cannot fetch deleted article - so only absence is implied; if a fetch endpoint existed, would test NotFound here)
  // 5. No orphan check possible (no asset/comment/fetch APIs are defined in test scope).

  // 6. Attempt forbidden access by unauthenticated actor (new connection, no headers).
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin/unauthenticated cannot erase articles",
    async () => {
      await api.functional.discussionBoard.admin.articles.erase(unauthConn, {
        articleId,
      });
    },
  );
}
