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
 * Verify admin-only hard deletion of discussion board articles in a realistic
 * multi-actor flow.
 *
 * Business context
 *
 * - The discussion board has separate adminUser and memberUser actors.
 * - Members create articles under categories; admins manage categories and can
 *   forcibly remove articles.
 * - DELETE /discussionBoard/adminUser/articles/{articleId} is documented as an
 *   admin-only hard delete that permanently removes the article row.
 *
 * This test validates:
 *
 * 1. An admin can register and log in, receiving valid authorization tokens.
 * 2. An admin can create a category used for article classification.
 * 3. A member can register and create an article that belongs to that category.
 * 4. A member (non-admin) cannot call the admin-only erase endpoint.
 * 5. An admin can successfully erase the member's article using the articleId.
 * 6. A second erase attempt on the same articleId results in an error, proving the
 *    article was removed.
 *
 * NOTE: The original scenario mentioned GET
 * /discussionBoard/articles/{articleId} to check 404 after deletion, but no
 * such endpoint exists in the provided SDK. Instead, we validate deletion
 * behavior by ensuring that repeated delete attempts fail, which demonstrates
 * that the target record is no longer deletable.
 */
export async function test_api_discussion_board_article_delete_by_admin_user(
  connection: api.IConnection,
) {
  // --- 1. Admin registration (join) ---
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = "Adm!n" as string &
    tags.Format<"password">;
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IAuthorizationToken>(adminJoin.token);
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminJoin);

  // --- 2. Admin creates a discussion article category ---
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert<IDiscussionBoardArticleCategory>(category);

  // --- 3. Member registration (join) ---
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = "member-pass-1234";
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(memberJoin);

  // Ensure multi-actor context: admin and member IDs must differ
  TestValidator.notEquals(
    "admin and member should have different IDs",
    adminJoin.id,
    memberJoin.id,
  );

  // --- 4. Member creates an article under the created category ---
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
  typia.assert<IDiscussionBoardArticle>(article);

  // --- 5. Negative case: member should not be able to call admin erase ---
  await TestValidator.error(
    "member user cannot hard-delete article via admin endpoint",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.erase(
        connection,
        {
          articleId: article.id,
        },
      );
    },
  );

  // --- 6. Switch back to admin session via login ---
  const adminLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: adminLoginHref,
    referrer: adminLoginReferrer,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminLogin);

  // --- 7. Positive case: admin deletes the article successfully ---
  await api.functional.discussionBoard.adminUser.articles.erase(connection, {
    articleId: article.id,
  });

  // --- 8. Post-deletion: repeating delete should fail ---
  await TestValidator.error(
    "admin cannot delete the same article twice",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.erase(
        connection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
