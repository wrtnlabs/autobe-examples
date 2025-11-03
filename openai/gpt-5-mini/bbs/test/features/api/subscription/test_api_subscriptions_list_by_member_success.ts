import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";

export async function test_api_subscriptions_list_by_member_success(
  connection: api.IConnection,
) {
  // 1) Register a new test member (self sign-up)
  const username = `test_${RandomGenerator.alphaNumeric(6)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = `A${RandomGenerator.alphaNumeric(5)}a1!${RandomGenerator.alphabets(3)}`; // >=12 chars
  const joinBody = {
    username,
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);

  // Member username must match our requested username
  TestValidator.equals(
    "registered username matches request",
    member.username,
    username,
  );

  // 2) Create an article as the member
  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: createArticleBody,
    });
  typia.assert(article);
  TestValidator.equals(
    "created article title matches request",
    article.title,
    createArticleBody.title,
  );

  // 3) Create a subscription to the article for the created member
  const createSubBody = {
    target_type: "article",
    target_id: article.id,
    delivery_mode: "immediate",
    active: true,
  } satisfies IDiscussionBoardSubscription.ICreate;

  const subscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.create(
      connection,
      {
        memberUsername: member.username,
        body: createSubBody,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription targetType is article",
    subscription.targetType,
    "article",
  );
  TestValidator.equals(
    "subscription targetId matches article id",
    subscription.targetId,
    article.id,
  );
  TestValidator.equals(
    "subscription deliveryMode is immediate",
    subscription.deliveryMode,
    "immediate",
  );
  TestValidator.equals(
    "subscription active flag is true",
    subscription.active,
    true,
  );

  // 4) List subscriptions (basic listing) and validate pagination + presence
  const listRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSubscription.IRequest;

  const pageResult: IPageIDiscussionBoardSubscription.ISummary =
    await api.functional.discussionBoard.member.members.subscriptions.index(
      connection,
      {
        memberUsername: member.username,
        body: listRequest,
      },
    );
  typia.assert(pageResult);

  TestValidator.equals(
    "pagination current is 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    pageResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "created subscription appears in listing",
    pageResult.data.some((s) => s.id === subscription.id),
  );

  // 5) Validate filtering: deliveryMode and active
  const filterRequest = {
    page: 1,
    limit: 20,
    deliveryMode: "immediate",
    active: true,
  } satisfies IDiscussionBoardSubscription.IRequest;

  const filteredPage: IPageIDiscussionBoardSubscription.ISummary =
    await api.functional.discussionBoard.member.members.subscriptions.index(
      connection,
      {
        memberUsername: member.username,
        body: filterRequest,
      },
    );
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered results all match deliveryMode and active",
    filteredPage.data.every(
      (s) => s.deliveryMode === "immediate" && s.active === true,
    ),
  );

  // 6) Validate page/limit honored by requesting limit=1
  const smallPageRequest = {
    page: 1,
    limit: 1,
  } satisfies IDiscussionBoardSubscription.IRequest;

  const smallPage: IPageIDiscussionBoardSubscription.ISummary =
    await api.functional.discussionBoard.member.members.subscriptions.index(
      connection,
      {
        memberUsername: member.username,
        body: smallPageRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page limit honored",
    smallPage.pagination.limit,
    1,
  );
}
