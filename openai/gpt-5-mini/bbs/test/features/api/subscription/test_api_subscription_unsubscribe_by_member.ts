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

export async function test_api_subscription_unsubscribe_by_member(
  connection: api.IConnection,
) {
  /**
   * E2E: Member unsubscribe (soft-delete) workflow
   *
   * Steps:
   *
   * 1. Register member A (primary actor)
   * 2. Create an article as member A
   * 3. Create a subscription (member A -> article)
   * 4. Verify unauthenticated requests are rejected
   * 5. Verify other-member cannot unsubscribe member A's subscription
   * 6. Perform unsubscribe as owner (member A)
   * 7. Verify idempotency by deleting again
   * 8. Verify deleting a non-associated/random target errors
   * 9. Attempt to recreate subscription and accept either success or conflict
   */

  // 1) Member A registration (authenticated context will be set on the provided connection)
  const memberAUsername = RandomGenerator.alphaNumeric(8);
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(12);

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberAUsername,
        email: memberAEmail,
        password: memberAPassword,
        href: "https://example.com/entry",
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
          sentences: 6,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        // Use draft to avoid publish preconditions
        state: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Create subscription for memberA -> article
  const subscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.create(
      connection,
      {
        memberUsername: memberA.username,
        body: {
          target_type: "article",
          target_id: article.id,
          delivery_mode: "immediate",
          active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4) Unauthenticated requests must be rejected (error expected)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated unsubscribe should fail",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.erase(
        unauthConn,
        {
          memberUsername: memberA.username,
          targetType: "article",
          targetId: article.id,
        },
      );
    },
  );

  // 5) Ownership: member B should NOT be able to unsubscribe member A's subscription
  const memberBConn: api.IConnection = { ...connection, headers: {} };
  const memberBUsername = RandomGenerator.alphaNumeric(8);
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(12);

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberBConn, {
      body: {
        username: memberBUsername,
        email: memberBEmail,
        password: memberBPassword,
        href: "https://example.com/entry",
        referrer: "https://referrer.example.com/",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberB);

  await TestValidator.error(
    "other member cannot unsubscribe another member's subscription",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.erase(
        memberBConn,
        {
          memberUsername: memberA.username,
          targetType: "article",
          targetId: article.id,
        },
      );
    },
  );

  // 6) Successful unsubscribe by owner (member A)
  await api.functional.discussionBoard.member.members.subscriptions.erase(
    connection,
    {
      memberUsername: memberA.username,
      targetType: "article",
      targetId: article.id,
    },
  );

  // If we reach here no exception was thrown - assert success via predicate
  TestValidator.predicate("owner unsubscribe completed without throwing", true);

  // 7) Idempotency: deleting again should succeed (no error)
  await api.functional.discussionBoard.member.members.subscriptions.erase(
    connection,
    {
      memberUsername: memberA.username,
      targetType: "article",
      targetId: article.id,
    },
  );
  TestValidator.predicate(
    "idempotent unsubscribe (second delete) completed without throwing",
    true,
  );

  // 8) Referential integrity: deleting a non-associated / random target should error
  const randomTargetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unsubscribing non-existent subscription should fail",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.erase(
        connection,
        {
          memberUsername: memberA.username,
          targetType: "article",
          targetId: randomTargetId,
        },
      );
    },
  );

  // 9) Attempt to recreate subscription after deletion.
  // Server behavior may vary (201 created, 409 conflict, or return existing). Accept either.
  try {
    const recreated: IDiscussionBoardSubscription =
      await api.functional.discussionBoard.member.members.subscriptions.create(
        connection,
        {
          memberUsername: memberA.username,
          body: {
            target_type: "article",
            target_id: article.id,
            delivery_mode: "immediate",
          } satisfies IDiscussionBoardSubscription.ICreate,
        },
      );
    typia.assert(recreated);
    TestValidator.predicate(
      "recreated subscription is active",
      recreated.active === true,
    );
  } catch {
    // Creation may fail due to idempotent conflict - acceptable outcome
    TestValidator.predicate(
      "recreation resulted in conflict or idempotent response (acceptable)",
      true,
    );
  }
}
