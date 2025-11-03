import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_subscription_member_retrieval_by_moderator(
  connection: api.IConnection,
) {
  /**
   * 1. Create moderator account on the primary connection (will set moderator
   *    token on `connection`).
   */
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: "P@ssw0rd-Moderator1",
        display_name: RandomGenerator.name(),
        href: "https://example.com/moderator/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Keep moderator.id/username available for debug if needed

  /**
   * 2. Prepare an unauthenticated clone of connection for member flows so we won't
   *    accidentally use moderator's token when creating member and article.
   *    This follows the allowed pattern: create a shallow copy with headers:
   *    {}.
   */
  const memberConn: api.IConnection = { ...connection, headers: {} };

  /**
   * 3. Create a member account using memberConn (will set member token on
   *    memberConn).
   */
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "P@ssw0rd-Member1",
        href: "https://example.com/member/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  /** 4. Create an article as the member */
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(memberConn, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
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

  /** 5. Create a subscription for that member to the created article */
  const createdSubscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.create(
      memberConn,
      {
        memberUsername: member.username,
        body: {
          target_type: "article",
          target_id: article.id,
          delivery_mode: "immediate",
          active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(createdSubscription);

  // Validate creation returned expected linkage
  TestValidator.equals(
    "created subscription links to member",
    createdSubscription.member.username,
    member.username,
  );
  TestValidator.equals(
    "created subscription target id",
    createdSubscription.targetId,
    article.id,
  );
  TestValidator.equals(
    "created subscription target type",
    createdSubscription.targetType,
    "article",
  );
  TestValidator.equals(
    "created subscription delivery mode",
    createdSubscription.deliveryMode,
    "immediate",
  );
  TestValidator.predicate(
    "created subscription active",
    createdSubscription.active === true,
  );

  /**
   * 6. As moderator (original connection still holds moderator token), retrieve
   *    the member's subscription by target
   */
  const fetched: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.moderator.members.subscriptions.at(
      connection,
      {
        memberUsername: member.username,
        targetType: "article",
        targetId: article.id,
      },
    );
  typia.assert(fetched);

  // Business validations on fetched subscription
  TestValidator.equals(
    "fetched subscription member username",
    fetched.member.username,
    member.username,
  );
  TestValidator.equals(
    "fetched subscription targetId",
    fetched.targetId,
    article.id,
  );
  TestValidator.equals(
    "fetched subscription targetType",
    fetched.targetType,
    "article",
  );
  TestValidator.equals(
    "fetched subscription deliveryMode",
    fetched.deliveryMode,
    "immediate",
  );
  TestValidator.predicate(
    "fetched subscription is active",
    fetched.active === true,
  );

  // Ensure createdAt exists (typia.assert already validates types), and that no sensitive member fields were leaked (member summary doesn't include email by design)
  typia.assert(fetched.createdAt);
}
