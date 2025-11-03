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

export async function test_api_subscription_upsert_by_member_for_article(
  connection: api.IConnection,
) {
  // 1) Register member A
  const memberAUsername = `${RandomGenerator.name(1).replace(/\s+/g, "_")}${RandomGenerator.alphaNumeric(4)}`;
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(12);

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberAUsername,
        email: memberAEmail,
        password: memberAPassword,
        href: "https://example.com/",
        referrer: "https://referrer.example.com/",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberA);

  // 2) Create an article as member A
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Upsert subscription (create) with delivery_mode 'immediate'
  const created: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.update(
      connection,
      {
        memberUsername: memberA.username,
        targetType: "article",
        targetId: article.id,
        body: {
          target_type: "article",
          target_id: article.id,
          delivery_mode: "immediate",
          active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(created);

  // Validate creation fields
  TestValidator.equals(
    "created subscription - member username matches",
    created.member.username,
    memberA.username,
  );
  TestValidator.equals(
    "created subscription - target type",
    created.targetType,
    "article",
  );
  TestValidator.equals(
    "created subscription - target id",
    created.targetId,
    article.id,
  );
  TestValidator.equals(
    "created subscription - delivery mode",
    created.deliveryMode,
    "immediate",
  );
  TestValidator.equals(
    "created subscription - active flag",
    created.active,
    true,
  );

  const subscriptionId = created.id;
  const beforeUpdatedAt = created.updatedAt ?? null;

  // 4) Update delivery preference to 'daily_digest'
  const updated: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.update(
      connection,
      {
        memberUsername: memberA.username,
        targetType: "article",
        targetId: article.id,
        body: {
          target_type: "article",
          target_id: article.id,
          delivery_mode: "daily_digest",
          active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(updated);

  // Validate update: same id, delivery mode changed, updatedAt changed
  TestValidator.equals(
    "updated subscription - same id",
    updated.id,
    subscriptionId,
  );
  TestValidator.equals(
    "updated subscription - delivery mode updated",
    updated.deliveryMode,
    "daily_digest",
  );
  TestValidator.notEquals(
    "updated subscription - updatedAt changed",
    updated.updatedAt ?? null,
    beforeUpdatedAt,
  );

  // 5) Negative: unauthenticated attempt must fail (error thrown)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot upsert subscription",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.update(
        unauthConn,
        {
          memberUsername: memberA.username,
          targetType: "article",
          targetId: article.id,
          body: {
            target_type: "article",
            target_id: article.id,
            delivery_mode: "immediate",
            active: true,
          } satisfies IDiscussionBoardSubscription.ICreate,
        },
      );
    },
  );

  // 6) Negative: different-member attempt must fail
  const connMemberB: api.IConnection = { ...connection, headers: {} };
  const memberBUsername = `${RandomGenerator.name(1).replace(/\s+/g, "_")}${RandomGenerator.alphaNumeric(4)}`;
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(12);

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connMemberB, {
      body: {
        username: memberBUsername,
        email: memberBEmail,
        password: memberBPassword,
        href: "https://example.com/",
        referrer: "https://referrer.example.com/",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberB);

  // While authenticated as memberB, attempt to upsert subscription for memberA -> should throw
  await TestValidator.error(
    "other member cannot upsert another member's subscription",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.update(
        connMemberB,
        {
          memberUsername: memberA.username,
          targetType: "article",
          targetId: article.id,
          body: {
            target_type: "article",
            target_id: article.id,
            delivery_mode: "immediate",
            active: true,
          } satisfies IDiscussionBoardSubscription.ICreate,
        },
      );
    },
  );
}
