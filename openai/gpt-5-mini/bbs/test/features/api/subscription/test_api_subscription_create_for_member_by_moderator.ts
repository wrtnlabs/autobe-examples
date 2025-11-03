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

export async function test_api_subscription_create_for_member_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create a member (memberA)
  const memberPassword = `Aa1!${RandomGenerator.alphaNumeric(8)}`;
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: "http://example.com/entry",
        referrer: "http://example.com/ref",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2) Create an article as memberA
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_slug: null,
        tag_slugs: [],
        state: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Register a moderator (this will set connection Authorization to moderator)
  const moderatorPassword = `Mm1!${RandomGenerator.alphaNumeric(8)}`;
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `mod_${RandomGenerator.alphaNumeric(6)}`;
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "http://example.com/mod",
        referrer: "http://example.com/ref",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 4) As moderator, create subscription for memberA -> article
  const subscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.moderator.members.subscriptions.create(
      connection,
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
  typia.assert(subscription);

  TestValidator.equals(
    "subscription member username matches created member",
    subscription.member.username,
    member.username,
  );
  TestValidator.equals(
    "subscription target id matches created article",
    subscription.targetId,
    article.id,
  );

  // 5) Negative: repeating the same create call should fail (409 / conflict)
  await TestValidator.error("duplicate subscription should fail", async () => {
    await api.functional.discussionBoard.moderator.members.subscriptions.create(
      connection,
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
  });

  // 6) Negative: attempt as a non-moderator should fail (403)
  // Create another member (memberB) via join which sets connection Authorization to memberB
  const memberBPassword = `Bb1!${RandomGenerator.alphaNumeric(8)}`;
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = `u_${RandomGenerator.alphaNumeric(7)}`;
  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberBUsername,
        email: memberBEmail,
        password: memberBPassword,
        href: "http://example.com/entry2",
        referrer: "http://example.com/ref2",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberB);

  await TestValidator.error(
    "non-moderator cannot create subscription",
    async () => {
      await api.functional.discussionBoard.moderator.members.subscriptions.create(
        connection,
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
    },
  );
}
