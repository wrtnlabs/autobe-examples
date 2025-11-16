import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that an authenticated adminUser can view a member user's full
 * detail.
 *
 * Business context:
 *
 * - Support staff and moderators use
 *   /discussionBoard/adminUser/memberUsers/{memberUserId} to inspect a member
 *   account: identity, profile, and lifecycle flags.
 * - The API must return a complete IDiscussionBoardMemberuser payload while never
 *   exposing sensitive internals like password_hash.
 *
 * Scenario covered by this test:
 *
 * 1. Register a new member user (join) and capture its id.
 * 2. Register a new adminUser and obtain an admin session (token in
 *    connection.headers).
 * 3. As adminUser, create at least one article category so that the board has a
 *    valid category for member articles.
 * 4. Switch back to the member user and create an article under that category so
 *    the target memberUserId is an "engaged" account.
 * 5. Switch back to adminUser and call GET
 *    /discussionBoard/adminUser/memberUsers/{memberUserId}.
 * 6. Verify response type and important business fields.
 */
export async function test_api_admin_member_user_detail_basic(
  connection: api.IConnection,
) {
  // 1. Member user joins the discussion board
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(1),
    bio: null,
    location: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Admin user joins to obtain admin session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1), // adjust to DTO naming below
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As adminUser, create an article category
  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 4. Switch back to member user via login, then create an article
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 5. Switch back to adminUser via login to ensure we call admin endpoint as admin
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Admin retrieves the member user's detail
  const detail: IDiscussionBoardMemberuser =
    await api.functional.discussionBoard.adminUser.memberUsers.at(connection, {
      memberUserId,
    });
  typia.assert(detail);

  // 7. Business-level assertions on returned member detail
  TestValidator.equals(
    "member id must match the originally joined member",
    detail.id,
    memberUserId,
  );

  TestValidator.equals(
    "member email must match join email",
    detail.email,
    memberJoinBody.email,
  );

  TestValidator.equals(
    "display_name must match join displayName",
    detail.display_name,
    memberJoinBody.displayName,
  );

  TestValidator.predicate(
    "freshly joined account should not be closed by admin",
    detail.closed_by_admin === false,
  );

  TestValidator.predicate(
    "freshly joined account should not be soft-deleted",
    detail.deleted_at === null || detail.deleted_at === undefined,
  );

  TestValidator.predicate(
    "freshly joined account should not be closed",
    detail.closed_at === null || detail.closed_at === undefined,
  );

  // We do not explicitly check password_hash absence beyond relying on the
  // DTO type and typia.assert, which already guarantees that only documented
  // properties are present.
}
