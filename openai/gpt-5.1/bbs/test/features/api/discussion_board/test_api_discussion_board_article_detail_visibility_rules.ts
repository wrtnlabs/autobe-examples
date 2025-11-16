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
 * Validate visibility of discussion board article details for active articles.
 *
 * Business context:
 *
 * - Articles belong to categories managed by admin users.
 * - Member users author articles under those categories.
 * - The public detail endpoint GET /discussionBoard/articles/{articleId} should
 *   expose full details for active (non-hidden, non-deleted) articles to
 *   typical front-end callers, which frequently operate without explicit
 *   backend-issued auth headers.
 *
 * This test exercises a realistic multi-actor flow:
 *
 * 1. An admin user joins and creates a discussion-board article category.
 * 2. A member user joins and creates an article under that category.
 * 3. The article is fetched via the public detail endpoint using the same
 *    authenticated connection to verify basic correctness.
 * 4. The connection is cloned into an unauthenticated variant (empty headers), and
 *    the same article detail is fetched again to validate that active articles
 *    remain visible even without explicit auth context.
 *
 * Hidden / deleted moderation states cannot be tested here because no
 * moderation or deletion endpoints are provided in the SDK. Therefore, this
 * test focuses on the positive case that active articles are retrievable and
 * that the detail endpoint works from both authenticated and unauthenticated
 * perspectives without leaking inconsistent data.
 */
export async function test_api_discussion_board_article_detail_visibility_rules(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) to manage categories.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassw0rd!", // satisfies string & tags.Format<"password">
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an article category.
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
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

  TestValidator.equals(
    "category code must match creation payload",
    category.code,
    categoryCreateBody.code,
  );
  TestValidator.equals(
    "category name must match creation payload",
    category.name,
    categoryCreateBody.name,
  );

  // 3. Member user joins and creates an article under the category.
  const memberJoinBody = {
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(createdArticle);

  // Basic sanity checks on created article.
  TestValidator.equals(
    "created article title must match request",
    createdArticle.title,
    articleCreateBody.title,
  );
  TestValidator.equals(
    "created article body must match request",
    createdArticle.body,
    articleCreateBody.body,
  );
  TestValidator.equals(
    "created article summary must match request",
    createdArticle.summary ?? null,
    articleCreateBody.summary ?? null,
  );
  TestValidator.equals(
    "created article category id must match category",
    createdArticle.category.id,
    category.id,
  );

  // 4. Fetch article detail via authenticated connection and verify.
  const detailAuthenticated: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(detailAuthenticated);

  TestValidator.equals(
    "detail (authenticated) id must equal created article id",
    detailAuthenticated.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "detail (authenticated) title must equal created title",
    detailAuthenticated.title,
    createdArticle.title,
  );
  TestValidator.equals(
    "detail (authenticated) category id must equal created category id",
    detailAuthenticated.category.id,
    category.id,
  );

  // 5. Fetch article detail via unauthenticated-like connection.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const detailUnauthenticated: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(unauthConnection, {
      articleId: createdArticle.id,
    });
  typia.assert(detailUnauthenticated);

  TestValidator.equals(
    "detail (unauthenticated) id must equal created article id",
    detailUnauthenticated.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "detail (unauthenticated) title must equal created title",
    detailUnauthenticated.title,
    createdArticle.title,
  );
  TestValidator.equals(
    "detail (unauthenticated) category id must equal created category id",
    detailUnauthenticated.category.id,
    category.id,
  );
}
