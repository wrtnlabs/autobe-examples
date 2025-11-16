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
import type { IDiscussionBoardArticleOfAdminusersAdminAuthor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleOfAdminusersAdminAuthor";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that admin author lookup fails for member-authored articles.
 *
 * Business intent:
 *
 * - Articles written by regular member users must not expose any admin author
 *   information through the adminAuthor endpoint.
 * - Clients should be able to distinguish between "article has no admin author"
 *   and generic article-not-found conditions. In this test we focus on the
 *   former by ensuring that looking up an admin author for a member-authored
 *   article yields an error instead of returning an
 *   IDiscussionBoardArticleOfAdminusersAdminAuthor payload.
 *
 * End-to-end flow:
 *
 * 1. Register an adminUser account via /auth/adminUser/join and obtain
 *    authenticated admin context.
 * 2. As this adminUser, create a valid article category via
 *    /discussionBoard/adminUser/articleCategories.
 * 3. Register a memberUser account via /auth/memberUser/join and obtain an
 *    authenticated member context.
 * 4. As this memberUser, create a new article via
 *    /discussionBoard/memberUser/articles, using the previously created
 *    category id, guaranteeing that the resulting article is authored by a
 *    member, not an admin.
 * 5. Create an unauthenticated connection clone (no Authorization header).
 * 6. From that unauthenticated connection, call
 *    /discussionBoard/articles/{articleId}/adminAuthor for the member-authored
 *    article id.
 * 7. Assert that the call results in an error via TestValidator.error, which
 *    semantically represents "no admin author for this article" in this
 *    backend, rather than returning any admin author DTO.
 */
export async function test_api_discussion_board_admin_author_not_found_for_member_authored_article(
  connection: api.IConnection,
) {
  // 1. Admin user joins to get admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an article category
  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Member user joins to get member context
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/member/join",
    referrer: "https://example.com/member/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates an article using the created category
  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: createArticleBody,
      },
    );
  typia.assert(article);

  TestValidator.equals(
    "created article should reference the chosen category",
    article.category.id,
    category.id,
  );

  // 5. Create an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6-7. Calling adminAuthor for a member-authored article should fail
  await TestValidator.error(
    "admin author lookup must fail for member-authored article",
    async () => {
      await api.functional.discussionBoard.articles.adminAuthor.at(
        unauthenticated,
        {
          articleId: article.id,
        },
      );
    },
  );
}
