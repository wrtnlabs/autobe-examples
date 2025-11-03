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

/**
 * Validate duplicate subscription creation is rejected for the same member and
 * target.
 *
 * Business context:
 *
 * - Members may subscribe to various targets (articles or authors). The backend
 *   enforces a uniqueness constraint on (member, target_type, target_id) to
 *   prevent duplicate subscriptions.
 *
 * Test steps:
 *
 * 1. Register a fresh member via POST /auth/member/join (IAuthorization returned
 *    and SDK sets Authorization header).
 * 2. Create an article as that member via POST /discussionBoard/member/articles.
 * 3. Create a subscription for that member to the article (should succeed).
 * 4. Attempt to create the identical subscription again (should fail). Use
 *    TestValidator.error to assert failure.
 */
export async function test_api_subscription_duplicate_conflict_by_member(
  connection: api.IConnection,
) {
  // 1) Member registration
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234", // 12 chars, meets minimum requirement
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_slug: null,
    tag_slugs: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Create the first subscription (should succeed)
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
        memberUsername: member.username,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription belongs to creating member",
    subscription.member.username,
    member.username,
  );
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

  // 4) Attempt duplicate creation - should throw (uniqueness constraint)
  await TestValidator.error(
    "creating duplicate subscription should fail",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.create(
        connection,
        {
          memberUsername: member.username,
          body: subscriptionBody,
        },
      );
    },
  );
}
