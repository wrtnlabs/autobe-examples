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

export async function test_api_subscription_retrieval_by_member_success(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Register a new discussion-board member (auth.member.join)
   * 2. Create an article as the member (discussionBoard.member.articles.create)
   * 3. Create a subscription for that member to the article
   * 4. Retrieve the subscription via memberUsername/targetType/targetId and
   *    validate business fields
   *
   * Steps are implemented with fully-typed request bodies using 'satisfies' and
   * typia.assert() for response validation.
   */

  // 1) Register member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(8).toLowerCase();
  const memberPassword = "SecurePassw0rd!"; // >=12 chars, contains categories

  const createdMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: "https://example.com/test",
        referrer: "https://example.com/",
        display_name: RandomGenerator.name(),
        ip: null,
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(createdMember);

  // 2) Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 16,
          wordMin: 4,
          wordMax: 8,
        }),
        category_slug: null,
        tag_slugs: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Create subscription linking member -> article
  const createdSubscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.create(
      connection,
      {
        memberUsername: createdMember.username,
        body: {
          target_type: "article",
          target_id: article.id,
          delivery_mode: "immediate",
          active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(createdSubscription);

  // 4) Retrieve the subscription by memberUsername / targetType / targetId
  const retrieved: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.at(
      connection,
      {
        memberUsername: createdMember.username,
        targetType: "article",
        targetId: article.id,
      },
    );
  typia.assert(retrieved);

  // Business validations
  TestValidator.equals(
    "subscription member username matches created member",
    retrieved.member.username,
    createdMember.username,
  );

  TestValidator.equals(
    "subscription targetType is article",
    retrieved.targetType,
    "article",
  );

  TestValidator.equals(
    "subscription targetId matches article id",
    retrieved.targetId,
    article.id,
  );

  TestValidator.equals(
    "subscription deliveryMode is immediate",
    retrieved.deliveryMode,
    "immediate",
  );

  TestValidator.equals("subscription active is true", retrieved.active, true);

  // deletedAt should be null for an active subscription (use predicate for safety)
  TestValidator.predicate(
    "subscription.deletedAt is null for active subscription",
    retrieved.deletedAt === null,
  );
}
