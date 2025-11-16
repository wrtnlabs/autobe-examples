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
 * Validate that an admin can hard-delete a member user who has already created
 * discussion-board content, and that subsequent delete attempts fail.
 *
 * Business flow:
 *
 * 1. Register a member user (join) and capture their id, email, and password.
 * 2. Register an admin user (join) and stay authenticated as admin.
 * 3. As admin, create an article category to be used for member-authored articles.
 * 4. Switch authentication to the member user (login) and create an article under
 *    the created category.
 * 5. Switch back to the admin user (login) and call the admin-only
 *    memberUsers.erase endpoint to hard-delete the member account.
 * 6. Confirm the erase call completes without error for the existing member id.
 * 7. Call erase again with the same memberUserId wrapped in TestValidator.error to
 *    assert that a second deletion fails because the member no longer exists.
 *
 * This test uses only existing APIs: there is no GET for memberUsers, so the
 * negative verification is performed via the second DELETE call.
 */
export async function test_api_admin_member_user_hard_delete_after_content_creation(
  connection: api.IConnection,
) {
  // 1. Register member user who will later be deleted
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphabets(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://discussion.example.com/signup",
    referrer: "https://discussion.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register admin user and stay authenticated as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://discussion.example.com/admin/signup",
    referrer: "https://discussion.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 4. Switch auth to member and create an article under the category
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://discussion.example.com/login",
    referrer: "https://discussion.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberSession: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberSession);

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  TestValidator.equals(
    "article category must match created category",
    article.category.id,
    category.id,
  );

  // 5. Switch back to admin user via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://discussion.example.com/admin/login",
    referrer: "https://discussion.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminSession: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminSession);

  // 6. As admin, erase the member user account
  await api.functional.discussionBoard.adminUser.memberUsers.erase(connection, {
    memberUserId: memberAuthorized.id,
  });

  // 7. Second erase attempt must fail because the user no longer exists
  await TestValidator.error(
    "second erase of same member should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.erase(
        connection,
        { memberUserId: memberAuthorized.id },
      );
    },
  );
}
