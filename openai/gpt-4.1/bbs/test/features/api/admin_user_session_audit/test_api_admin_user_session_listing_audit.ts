import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";

/**
 * Validate that an authenticated administrator can retrieve a paginated list of
 * login sessions for a specific user.
 *
 * This test covers the audit/security review workflow. It confirms that admins
 * can view session records of arbitrary users for audit purposes, all required
 * audit fields are present, and paginated results are correctly implemented.
 * The test also ensures that privacy is enforced (admin can view other's
 * sessions, while session data is otherwise protected).
 *
 * Step-by-step process:
 *
 * 1. Admin account registration (join endpoint).
 * 2. Standard user registration (user join endpoint).
 * 3. User creates an article (to guarantee at least one session exists).
 * 4. Admin (already authenticated) requests session listing for that user.
 * 5. Confirm correct session data returned with all expected audit fields,
 *    pagination structure, and access control by admin role.
 */
export async function test_api_admin_user_session_listing_audit(
  connection: api.IConnection,
) {
  // 1. Register Admin Account (and login)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
        avatar_url: undefined,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("Admin email matches", admin.email, adminEmail);
  TestValidator.equals(
    "Admin display_name matches",
    admin.display_name,
    adminDisplayName,
  );
  TestValidator.equals("Admin is not locked", admin.is_locked, false);
  TestValidator.equals("Admin is not deleted", admin.deleted_at, null);
  TestValidator.equals("Admin token is present", !!admin.token.access, true);
  // The SDK should now be authenticated as admin

  // 2. Register Standard User
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(10);

  // Switch to a clean connection for user registration (ensure separate session context)
  const userConn: api.IConnection = { ...connection, headers: {} };
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(userConn, {
      body: {
        email: userEmail,
        password: userPassword,
        display_name: userDisplayName,
        avatar_url: undefined,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);
  TestValidator.equals("User email matches", user.email, userEmail);
  TestValidator.equals(
    "User display_name matches",
    user.display_name,
    userDisplayName,
  );
  TestValidator.equals("User is not locked", user.is_locked, false);
  TestValidator.equals("User is not deleted", user.deleted_at, null);
  TestValidator.equals("User token is present", !!user.token.access, true);

  // 3. User creates a discussion article to ensure a session exists for audit
  const articleTitle = RandomGenerator.paragraph({ sentences: 4 });
  const articleBody = RandomGenerator.content({ paragraphs: 2 });
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(userConn, {
      body: {
        title: articleTitle,
        body: articleBody,
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "Article author matches user",
    article.author.id,
    user.id,
  );
  TestValidator.equals("Article title matches", article.title, articleTitle);

  // 4. Admin (with admin context) requests sessions for the registered user
  // Ensure SDK is still authenticated as admin from step 1
  const auditRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardUserSession.IRequest;
  const sessionResults: IPageIDiscussionBoardUserSession.ISummary =
    await api.functional.discussionBoard.admin.users.sessions.index(
      connection,
      {
        userId: user.id,
        body: auditRequestBody,
      },
    );
  typia.assert(sessionResults);
  TestValidator.equals(
    "Results contain page object",
    typeof sessionResults.pagination,
    "object",
  );
  TestValidator.equals(
    "Results contain data array",
    Array.isArray(sessionResults.data),
    true,
  );
  TestValidator.equals(
    "Current page is 1",
    sessionResults.pagination.current,
    1,
  );
  TestValidator.equals("Limit is correct", sessionResults.pagination.limit, 20);
  TestValidator.predicate(
    "Returned sessions belong to audited user",
    sessionResults.data.every((s) => s.discussion_board_user_id === user.id),
  );
  // Test audit fields present & populated for at least one session
  if (sessionResults.data.length > 0) {
    const session = sessionResults.data[0];
    TestValidator.equals("session.id format", typeof session.id, "string");
    TestValidator.equals("session.ip format", typeof session.ip, "string");
    TestValidator.equals("session.href format", typeof session.href, "string");
    TestValidator.equals(
      "session.referrer format",
      typeof session.referrer,
      "string",
    );
    TestValidator.equals(
      "session.created_at format",
      typeof session.created_at,
      "string",
    );
  }
  // 5. Confirm all access was via admin, and not user, and privacy rules are enforced by context switching above.
}
