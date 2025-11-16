import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test API for deleting an article attachment by a discussion board user
 * (member).
 *
 * The goal is to check that a registered user can call the attachment deletion
 * endpoint with authentication.
 *
 * Limitations: Article creation, attachment upload, retrieval, and validation
 * are not available due to lack of relevant APIs and DTOs.
 *
 * Steps:
 *
 * 1. Register a new user (member) using the join endpoint to obtain authentication
 *    (IAuthorized).
 * 2. Attempt to delete an attachment using random UUID values for 'articleId' and
 *    'attachmentId'.
 * 3. Confirm that the erase endpoint does not throw unexpected errors with
 *    authenticated user.
 * 4. Business logic validation or state validation is not possible due to
 *    unavailable API endpoints and DTOs.
 */
export async function test_api_article_attachment_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (member) and authenticate
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Call erase endpoint with random UUIDs for article and attachment
  await api.functional.discussionBoard.user.articles.attachments.erase(
    connection,
    {
      articleId: typia.random<string & tags.Format<"uuid">>(),
      attachmentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // 3. No further validation possible; lack of creation/query APIs for E2E validation.
}
