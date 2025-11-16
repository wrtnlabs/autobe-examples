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
import type { IDiscussionBoardArticleLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleLike";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that likes from multiple distinct member users on the same article
 * are aggregated correctly by the like creation endpoint.
 *
 * Business goals:
 *
 * - Ensure two different member users can like the same article.
 * - Confirm that each unique member like contributes exactly once to the
 *   aggregated totalLikeCount for that article.
 * - Verify that POST /discussionBoard/memberUser/articles/{articleId}/likes
 *   returns engagement state for the current caller, including
 *   likedByCurrentMember and the current totalLikeCount.
 * - Demonstrate that repeating POST for the same (member, article) pair does not
 *   increase the totalLikeCount (idempotent behaviour per member).
 *
 * End-to-end flow under test:
 *
 * 1. Register member user A (join → authenticated as A).
 * 2. Register member user B (join → authenticated as B).
 * 3. Register an admin user (join → authenticated as adminUser).
 * 4. As adminUser, create an article category.
 * 5. Login again as member user A.
 * 6. As member user A, create an article in the created category.
 * 7. As member user A, like the article once and assert likeCount==1 and
 *    likedByCurrentMember==true.
 * 8. Login as member user B.
 * 9. As member user B, like the same article and assert likeCount==2 and
 *    likedByCurrentMember==true.
 * 10. Optionally, call POST /likes again as member user B and assert that likeCount
 *     still equals 2, proving no double-counting for the same member.
 */
export async function test_api_article_like_creation_multiple_members_increment_count(
  connection: api.IConnection,
) {
  // 1. Register member user A via join (this will authenticate as member A)
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAPassword: string = RandomGenerator.alphaNumeric(16);

  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/join/member-a",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberA: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Register member user B via join (this will authenticate as member B)
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBPassword: string = RandomGenerator.alphaNumeric(16);

  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/join/member-b",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberB: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 3. Register an admin user via adminUser.join (authenticate as admin)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. As adminUser, create an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 5. Login again as member user A to make sure Authorization is A
  const memberALoginBody = {
    email: memberAEmail,
    password: memberAPassword,
    ip: null,
    href: "https://example.com/login/member-a",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  TestValidator.equals(
    "member A login id should match join id",
    memberALogin.id,
    memberA.id,
  );

  // 6. As member user A, create an article in that category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  TestValidator.equals(
    "created article category must match category used in request",
    article.category.id,
    category.id,
  );

  // 7. As member user A, like the article once
  const likeBodyForA = {} satisfies IDiscussionBoardArticleLike.ICreate;

  const likeFromA: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: likeBodyForA,
      },
    );
  typia.assert(likeFromA);

  TestValidator.equals(
    "likeFromA.article.id must match original article id",
    likeFromA.article.id,
    article.id,
  );

  TestValidator.equals(
    "after first like, totalLikeCount should be 1",
    likeFromA.totalLikeCount,
    1,
  );

  TestValidator.predicate(
    "likedByCurrentMember should be true for member A after liking",
    likeFromA.likedByCurrentMember === true,
  );

  // 8. Login as member user B
  const memberBLoginBody = {
    email: memberBEmail,
    password: memberBPassword,
    ip: null,
    href: "https://example.com/login/member-b",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  TestValidator.equals(
    "member B login id should match join id",
    memberBLogin.id,
    memberB.id,
  );

  // 9. As member user B, like the same article
  const likeBodyForB = {} satisfies IDiscussionBoardArticleLike.ICreate;

  const likeFromB: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: likeBodyForB,
      },
    );
  typia.assert(likeFromB);

  TestValidator.equals(
    "likeFromB.article.id must match original article id",
    likeFromB.article.id,
    article.id,
  );

  TestValidator.equals(
    "after second distinct member like, totalLikeCount should be 2",
    likeFromB.totalLikeCount,
    2,
  );

  TestValidator.predicate(
    "likedByCurrentMember should be true for member B after liking",
    likeFromB.likedByCurrentMember === true,
  );

  // 10. Idempotency check for member B: repeat like should not increase count
  const likeRepeatBodyForB = {} satisfies IDiscussionBoardArticleLike.ICreate;

  const likeFromBRepeat: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      {
        articleId: article.id,
        body: likeRepeatBodyForB,
      },
    );
  typia.assert(likeFromBRepeat);

  TestValidator.equals(
    "repeating like from same member B should not increase totalLikeCount beyond 2",
    likeFromBRepeat.totalLikeCount,
    2,
  );

  TestValidator.predicate(
    "likedByCurrentMember should remain true for member B on repeat like",
    likeFromBRepeat.likedByCurrentMember === true,
  );
}
