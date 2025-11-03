import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";

/**
 * Validate that an authenticated user can retrieve their own login sessions
 * with pagination.
 *
 * Steps:
 *
 * 1. Register a new user account using the public join endpoint; obtain access
 *    token and record userId.
 * 2. Create an article as this user (fulfills business prerequisite).
 * 3. Query /discussionBoard/user/users/{userId}/sessions with a simple (default)
 *    pagination request for the registered user.
 * 4. Assert that the result only includes sessions for the authenticated user,
 *    with correct session metadata fields present (id,
 *    discussion_board_user_id, ip, href, referrer, created_at, expired_at).
 * 5. Assert pagination info is present and logical.
 * 6. Assert that privacy is maintained (only the user's sessions are returned, and
 *    no other user data is visible).
 */
export async function test_api_user_session_listing_personal_review(
  connection: api.IConnection,
) {
  // 1. Register a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<64>
  >();
  const display_name = RandomGenerator.name();
  const avatar_url = null;
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      display_name,
      avatar_url,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registration);
  const userId = registration.id;

  // 2. User creates an article
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 7,
          wordMin: 2,
          wordMax: 5,
        }),
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Query sessions endpoint for the user using PATCH and default pagination
  const sessionPage =
    await api.functional.discussionBoard.user.users.sessions.index(connection, {
      userId,
      body: {},
    });
  typia.assert(sessionPage);

  // 4. Basic checks: sessions must all be for this user, session metadata fields present
  for (const session of sessionPage.data) {
    typia.assert(session);
    TestValidator.equals(
      "session.owner matches user",
      session.discussion_board_user_id,
      userId,
    );
    TestValidator.predicate(
      "session.id is uuid",
      typeof session.id === "string" && session.id.length > 0,
    );
    TestValidator.predicate(
      "session.ip exists",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session.href exists",
      typeof session.href === "string",
    );
    TestValidator.predicate(
      "session.referrer exists",
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      "session created_at format",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    // expired_at may be null, undefined, or string which is fine per DTO
  }

  // 5. Pagination info
  TestValidator.predicate(
    "pagination current page >= 1",
    sessionPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    sessionPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count >= 1",
    sessionPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    sessionPage.pagination.pages >= 1,
  );

  // 6. Privacy & business logic: no other users' session(s) shown
  TestValidator.predicate(
    "sessions only belong to the authenticated user",
    sessionPage.data.every((s) => s.discussion_board_user_id === userId),
  );
}
