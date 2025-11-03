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

export async function test_api_subscription_create_by_member_success(
  connection: api.IConnection,
) {
  // 1) Register a new member (join)
  const username = RandomGenerator.alphaNumeric(8); // allowed characters: letters & digits
  const joinBody = {
    username,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Validate that token exists and username matches
  TestValidator.predicate(
    "member join returned access token",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.equals(
    "joined username matches request",
    authorized.username,
    username,
  );

  // 2) Create an article as the member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  TestValidator.predicate(
    "article id assigned",
    typeof article.id === "string" && article.id.length > 0,
  );

  // 3) Create subscription for the article under the member's username
  const subscriptionBody = {
    target_type: "article",
    target_id: article.id,
    delivery_mode: "immediate",
    active: true,
  } satisfies IDiscussionBoardSubscription.ICreate;

  const subscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.create(
      connection,
      {
        memberUsername: authorized.username,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // Business-level validations
  TestValidator.equals(
    "subscription owner username matches",
    subscription.member.username,
    authorized.username,
  );

  TestValidator.equals(
    "subscription target type is article",
    subscription.targetType,
    "article",
  );

  TestValidator.equals(
    "subscription target id matches article id",
    subscription.targetId,
    article.id,
  );

  TestValidator.equals(
    "subscription delivery mode preserved",
    subscription.deliveryMode,
    "immediate",
  );

  TestValidator.equals(
    "subscription active flag preserved",
    subscription.active,
    true,
  );

  TestValidator.predicate(
    "subscription has createdAt timestamp",
    typeof subscription.createdAt === "string" &&
      subscription.createdAt.length > 0,
  );
}
