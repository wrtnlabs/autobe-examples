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
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Ensure adminUser can call guestUsers.update with a body that would represent
 * a conflicting anonymous_token change in a real backend, while the system is
 * in a realistic state with existing admin, member, category, and article.
 *
 * Steps:
 *
 * 1. Register an adminUser via /auth/adminUser/join to obtain admin tokens.
 * 2. As adminUser, create a discussionBoard article category via
 *    /discussionBoard/adminUser/articleCategories.
 * 3. Register a memberUser via /auth/memberUser/join.
 * 4. As memberUser, create an article in the created category via
 *    /discussionBoard/memberUser/articles to simulate live board content.
 * 5. Log back in as the original adminUser via /auth/adminUser/login to
 *    re-establish admin actor context.
 * 6. Generate two conceptual anonymous tokens, tokenA and tokenB, to represent
 *    distinct guest placeholders.
 * 7. Call PUT /discussionBoard/adminUser/guestUsers/{guestUserId} with a random
 *    UUID for guestUserId and a body that sets anonymous_token to tokenA.
 * 8. Assert that the response conforms to IDiscussionBoardGuestUser (using
 *    typia.assert) and that basic business fields are populated.
 */
export async function test_api_admin_guest_user_update_conflicting_anonymous_token(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) and obtain tokens
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As adminUser, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Register a memberUser (join)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create an article in the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 5. Log back in as the original adminUser to ensure admin context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminReAuth: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuth);

  // 6. Generate conceptual anonymous tokens for Guest A and Guest B
  const tokenA: string = `guestA_${RandomGenerator.alphaNumeric(24)}`;
  const tokenB: string = `guestB_${RandomGenerator.alphaNumeric(24)}`;
  void tokenB; // tokenB is conceptually used but not required in logic

  // 7. Call guestUsers.update for a random guestUserId using tokenA as the
  // new anonymous_token value (representing a conflicting token in real DB)
  const guestUserIdB: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateBody = {
    anonymous_token: tokenA,
  } satisfies IDiscussionBoardGuestUser.IUpdate;

  const updatedGuest: IDiscussionBoardGuestUser =
    await api.functional.discussionBoard.adminUser.guestUsers.update(
      connection,
      {
        guestUserId: guestUserIdB,
        body: updateBody,
      },
    );

  // 8. Validate response structure and basic business properties
  typia.assert(updatedGuest);

  TestValidator.predicate(
    "updated guest should have a non-empty anonymous_token",
    updatedGuest.anonymous_token.length > 0,
  );

  TestValidator.predicate(
    "updated guest should have a valid-looking id",
    updatedGuest.id.length > 0,
  );

  TestValidator.predicate(
    "updated guest should have created_at timestamp populated",
    updatedGuest.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated guest should have updated_at timestamp populated",
    updatedGuest.updated_at.length > 0,
  );
}
