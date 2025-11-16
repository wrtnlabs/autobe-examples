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
 * Validate that non-author member cannot update another member's article.
 *
 * Business flow:
 *
 * 1. Join Member A and keep its credentials.
 * 2. Join Member B and keep its credentials (non-author actor).
 * 3. Join an admin user.
 * 4. As admin, create an article category.
 * 5. Switch to Member A and create an article in the created category.
 * 6. Switch to Member B and attempt to update Member A's article via memberUser
 *    update API.
 * 7. Assert that the update attempt fails (authorization/ownership check).
 * 8. Fetch the article via public GET and confirm that all core content fields
 *    remain unchanged.
 */
export async function test_api_article_update_rejected_for_non_author_member(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAHref: string = "https://example.com/member-a/join";
  const memberAReferrer: string = "https://example.com/landing";
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAPassword: string = RandomGenerator.alphabets(12);

  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "203.0.113.10",
    href: memberAHref,
    referrer: memberAReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAJoin);

  // keep Member A credentials for later login

  // 2. Register Member B
  const memberBHref: string = "https://example.com/member-b/join";
  const memberBReferrer: string = "https://example.com/landing";
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberBPassword: string = RandomGenerator.alphabets(12);

  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "203.0.113.11",
    href: memberBHref,
    referrer: memberBReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberBJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBJoin);

  // 3. Register an admin user
  const adminHref: string = "https://example.com/admin/join";
  const adminReferrer: string = "https://example.com/admin/landing";
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(16) as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "198.51.100.5",
    href: adminHref,
    referrer: adminReferrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 4. As admin, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 5. Switch to Member A and create an article
  const memberALoginBody = {
    email: memberAEmail,
    password: memberAPassword,
    ip: "203.0.113.10",
    href: "https://example.com/member-a/login",
    referrer: memberAHref,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const originalArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: createArticleBody,
      },
    );
  typia.assert(originalArticle);

  // Keep a snapshot of original content for later comparison
  const originalSnapshot = {
    title: originalArticle.title,
    body: originalArticle.body,
    summary: originalArticle.summary ?? null,
    categoryId: originalArticle.category.id,
    moderationState: originalArticle.moderationState,
    createdAt: originalArticle.createdAt,
    updatedAt: originalArticle.updatedAt,
  };

  // 6. Switch to Member B and attempt to update Member A's article
  const memberBLoginBody = {
    email: memberBEmail,
    password: memberBPassword,
    ip: "203.0.113.11",
    href: "https://example.com/member-b/login",
    referrer: memberBHref,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    discussion_board_article_category_id: category.id,
  } satisfies IDiscussionBoardArticle.IUpdate;

  await TestValidator.error(
    "non-author member update must be rejected",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.update(
        connection,
        {
          articleId: originalArticle.id,
          body: updateBody,
        },
      );
    },
  );

  // 7. Fetch article again to verify it is unchanged
  const reloaded: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: originalArticle.id,
    });
  typia.assert(reloaded);

  TestValidator.equals(
    "article title remains unchanged after rejected update",
    reloaded.title,
    originalSnapshot.title,
  );
  TestValidator.equals(
    "article body remains unchanged after rejected update",
    reloaded.body,
    originalSnapshot.body,
  );
  TestValidator.equals(
    "article summary remains unchanged after rejected update",
    reloaded.summary ?? null,
    originalSnapshot.summary,
  );
  TestValidator.equals(
    "article category remains unchanged after rejected update",
    reloaded.category.id,
    originalSnapshot.categoryId,
  );
}
