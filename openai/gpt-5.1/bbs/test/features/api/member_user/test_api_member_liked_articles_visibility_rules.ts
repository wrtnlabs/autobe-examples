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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Verify that a member user's liked-articles listing only returns articles that
 * are both liked by the member and match the current visibility filters, and
 * that pagination metadata reflects only this visible subset.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Admin joins and becomes authenticated.
 * 2. Admin creates two categories (e.g., ECONOMY and POLITICS).
 * 3. A member user joins and becomes authenticated.
 * 4. The member creates three articles: two in ECONOMY, one in POLITICS.
 * 5. The member likes all three articles.
 * 6. The member calls the liked-articles index without filters and sees all three
 *    liked articles.
 * 7. The member calls liked-articles index filtered by the ECONOMY categoryId and
 *    sees only the two ECONOMY articles; the POLITICS article is effectively
 *    hidden by the filter.
 * 8. The member calls liked-articles index with a createdFrom filter in the future
 *    and gets an empty page; pagination metadata reports zero records.
 *
 * This simulates the visibility rules by using category- and date-based filters
 * instead of direct moderation/deletion toggles, which are not available in the
 * exposed SDK.
 */
export async function test_api_member_liked_articles_visibility_rules(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPw#123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates two categories
  const economyCategoryBody = {
    code: `ECON_${RandomGenerator.alphaNumeric(4)}`,
    name: "Economy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const politicsCategoryBody = {
    code: `POL_${RandomGenerator.alphaNumeric(4)}`,
    name: "Politics",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 2 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const economyCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: economyCategoryBody },
    );
  typia.assert(economyCategory);

  const politicsCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: politicsCategoryBody },
    );
  typia.assert(politicsCategory);

  // 3. Member joins
  const memberJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: "MemberPw#123",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: null,
    href: "https://member.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.test.com/" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 4. Member creates three articles
  const articleABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: economyCategory.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleBBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: economyCategory.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleCBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: politicsCategory.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleA: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleABody },
    );
  typia.assert(articleA);

  const articleB: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBBody },
    );
  typia.assert(articleB);

  const articleC: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCBody },
    );
  typia.assert(articleC);

  // 5. Member likes all three articles
  const likeABody = {} satisfies IDiscussionBoardArticleLike.ICreate;
  const likeBBody = {} satisfies IDiscussionBoardArticleLike.ICreate;
  const likeCBody = {} satisfies IDiscussionBoardArticleLike.ICreate;

  const likeA: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      { articleId: articleA.id, body: likeABody },
    );
  typia.assert(likeA);

  const likeB: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      { articleId: articleB.id, body: likeBBody },
    );
  typia.assert(likeB);

  const likeC: IDiscussionBoardArticleLike =
    await api.functional.discussionBoard.memberUser.articles.likes.create(
      connection,
      { articleId: articleC.id, body: likeCBody },
    );
  typia.assert(likeC);

  // 6. Liked articles without filters
  const likedAllBody = {} satisfies IDiscussionBoardArticle.IRequest;

  const likedAllPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.memberUser.members.likedArticles.index(
      connection,
      {
        memberUserId: memberId,
        body: likedAllBody,
      },
    );
  typia.assert(likedAllPage);

  const likedAllIds = likedAllPage.data.map((s) => s.id);

  TestValidator.predicate(
    "liked-articles index without filters returns all liked articles",
    likedAllIds.includes(articleA.id) &&
      likedAllIds.includes(articleB.id) &&
      likedAllIds.includes(articleC.id),
  );

  TestValidator.equals(
    "pagination.records should equal number of liked articles (3)",
    likedAllPage.pagination.records,
    3,
  );

  // 7. Liked articles filtered by ECONOMY category
  const likedEconomyBody = {
    categoryId: economyCategory.id,
  } satisfies IDiscussionBoardArticle.IRequest;

  const likedEconomyPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.memberUser.members.likedArticles.index(
      connection,
      {
        memberUserId: memberId,
        body: likedEconomyBody,
      },
    );
  typia.assert(likedEconomyPage);

  const likedEconomyIds = likedEconomyPage.data.map((s) => s.id);

  TestValidator.predicate(
    "economy-filtered liked-articles contains A and B",
    likedEconomyIds.includes(articleA.id) &&
      likedEconomyIds.includes(articleB.id),
  );

  TestValidator.predicate(
    "economy-filtered liked-articles excludes C (different category)",
    likedEconomyIds.includes(articleC.id) === false,
  );

  TestValidator.equals(
    "economy-filtered pagination.records equals 2",
    likedEconomyPage.pagination.records,
    2,
  );

  // 8. Liked articles filtered by future createdFrom so that no articles match
  const futureFrom = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const likedFutureBody = {
    createdFrom: futureFrom,
  } satisfies IDiscussionBoardArticle.IRequest;

  const likedFuturePage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.memberUser.members.likedArticles.index(
      connection,
      {
        memberUserId: memberId,
        body: likedFutureBody,
      },
    );
  typia.assert(likedFuturePage);

  TestValidator.equals(
    "future-filtered liked-articles should have empty data",
    likedFuturePage.data.length,
    0,
  );

  TestValidator.equals(
    "future-filtered pagination.records should be 0",
    likedFuturePage.pagination.records,
    0,
  );
}
