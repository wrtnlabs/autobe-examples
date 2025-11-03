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

export async function test_api_subscriptions_list_by_member_unauthorized(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for two members so SDK attaches tokens separately
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const callerConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create owner (memberA)
  const ownerJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(8)}Aa1!`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const owner: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(ownerConn, { body: ownerJoinBody });
  typia.assert(owner);

  // 3) Create an article as owner
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(ownerConn, {
      body: articleBody,
    });
  typia.assert(article);

  // 4) Create a subscription for owner to the article
  const subscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.create(
      ownerConn,
      {
        memberUsername: owner.username,
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
    "subscription owner is the article creator",
    subscription.member.username,
    owner.username,
  );

  // 5) Create caller (memberB)
  const callerJoinBody = {
    username: `${RandomGenerator.alphaNumeric(6)}x`,
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(8)}Bb2!`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const caller: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(callerConn, { body: callerJoinBody });
  typia.assert(caller);

  // 6) Attempt to list owner subscriptions as caller (should fail)
  await TestValidator.error(
    "caller cannot list another member's subscriptions",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.index(
        callerConn,
        {
          memberUsername: owner.username,
          body: {
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardSubscription.IRequest,
        },
      );
    },
  );
}
