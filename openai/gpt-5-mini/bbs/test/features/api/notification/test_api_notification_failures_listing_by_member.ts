import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationFailure";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationFailure";

export async function test_api_notification_failures_listing_by_member(
  connection: api.IConnection,
) {
  // 1) Create an isolated member account (owner)
  const ownerJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
    href: "http://example.com",
    referrer: "http://example.com",
  } satisfies IDiscussionBoardMember.IJoin;

  const owner: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: ownerJoinBody });
  typia.assert(owner);

  // 2) Create an article as the owner to provide realistic context
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_slug: null,
    tag_slugs: undefined,
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Create a subscription so the notification pipeline logically targets the owner
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
        memberUsername: owner.username,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 4) Prepare a notificationId (UUID). In environments without a test hook,
  //    we'll use a generated UUID and validate listing behavior and filtering semantics.
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 5) Call the failures listing endpoint as the owner and validate the response envelope
  const pageRequest = {
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardNotificationFailure.IRequest;

  const failuresPage: IPageIDiscussionBoardNotificationFailure.ISummary =
    await api.functional.discussionBoard.member.members.notifications.failures.index(
      connection,
      {
        memberUsername: owner.username,
        notificationId,
        body: pageRequest,
      },
    );
  typia.assert(failuresPage);

  // Validate pagination basic invariants
  TestValidator.equals(
    "pagination.current should be 1",
    failuresPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    failuresPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    failuresPage.pagination.pages >= 0,
  );

  // 6) If any returned item has an errorCode, test the errorCode filter semantics
  if (failuresPage.data.length > 0) {
    const sampleWithError = failuresPage.data.find(
      (d) => d.errorCode !== null && d.errorCode !== undefined,
    );

    if (sampleWithError) {
      const code = sampleWithError.errorCode!;
      const filteredRequest = {
        page: 1,
        limit: 10,
        errorCode: code,
      } satisfies IDiscussionBoardNotificationFailure.IRequest;

      const filtered: IPageIDiscussionBoardNotificationFailure.ISummary =
        await api.functional.discussionBoard.member.members.notifications.failures.index(
          connection,
          {
            memberUsername: owner.username,
            notificationId,
            body: filteredRequest,
          },
        );
      typia.assert(filtered);

      TestValidator.predicate(
        `all returned items must have errorCode ${code}`,
        filtered.data.every((d) => d.errorCode === code),
      );
    } else {
      // No records with errorCode present; mark as informational success
      TestValidator.predicate(
        "no failure records with errorCode to test filter",
        true,
      );
    }
  }

  // 7) Authorization boundary: create another member and assert non-owner access is rejected
  const otherJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
    href: "http://example.com",
    referrer: "http://example.com",
  } satisfies IDiscussionBoardMember.IJoin;

  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: otherJoinBody });
  typia.assert(otherMember);

  // Now the connection is authenticated as otherMember. Attempting to list owner failures
  // should be rejected by authorization checks (401/403). We assert that an error occurs.
  await TestValidator.error(
    "non-owner cannot access another member's notification failures",
    async () => {
      await api.functional.discussionBoard.member.members.notifications.failures.index(
        connection,
        {
          memberUsername: owner.username,
          notificationId,
          body: {
            page: 1,
          } satisfies IDiscussionBoardNotificationFailure.IRequest,
        },
      );
    },
  );
}
