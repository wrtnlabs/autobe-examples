import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";

/**
 * End-to-end test for notification search and bulk management for a member.
 *
 * Business context:
 *
 * - A member creates content and subscribes to it. Background workers generate
 *   notifications for the member. The member must be able to search and bulk
 *   manage their notifications. The test validates authentication, ownership,
 *   pagination/filtering, payload-safety (no PII leak), and bulk operation side
 *   effects using available DTO fields.
 *
 * Steps:
 *
 * 1. Register a new member (join) and assert authorized response.
 * 2. Create an article as that member.
 * 3. Create a subscription on the article for that member.
 * 4. Poll the notifications index (filtered by articleId) until notifications
 *    appear.
 * 5. Assert pagination, filtering, and payload-safety rules on returned summaries.
 * 6. Verify unauthenticated calls are rejected.
 * 7. Verify other members cannot manage this member's notifications.
 * 8. Perform a bulk action (mark_as_read) via the same endpoint and re-query to
 *    confirm mutation (compare updatedAt values).
 */
export async function test_api_notification_search_and_bulk_manage_by_member(
  connection: api.IConnection,
) {
  // 1) Create primary member (join) and assert authorized response
  const memberEmail = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: `u_${RandomGenerator.alphaNumeric(8)}`,
        email: memberEmail,
        // Ensure password meets length requirement
        password: "Aa1!" + RandomGenerator.alphaNumeric(9),
        href: "https://example.com/ctx",
        referrer: "https://example.com/prev",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        // leave category and tags undefined to avoid extra validation rules
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3) Create a subscription for the member to the article
  const subscription: IDiscussionBoardSubscription =
    await api.functional.discussionBoard.member.members.subscriptions.create(
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

  // 4) Poll notifications index until notifications referencing the article appear
  let page: IPageIDiscussionBoardNotification.ISummary | null = null;
  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts; ++attempt) {
    page =
      await api.functional.discussionBoard.member.members.notifications.index(
        connection,
        {
          memberUsername: member.username,
          body: {
            page: 1,
            limit: 20,
            articleId: article.id,
          } satisfies IDiscussionBoardNotification.IRequest,
        },
      );
    typia.assert(page);
    if (page.data.length > 0) break;

    // small delay before next attempt
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Ensure we have polling result
  if (!page) throw new Error("Polling did not initialize page variable");
  typia.assert(page);
  TestValidator.predicate(
    "notifications for article should appear within polling limit",
    page.data.length > 0,
  );

  // Validate one of the returned summaries references the created article
  const related = page.data.find((d) => d.article?.id === article.id);
  TestValidator.predicate(
    "at least one notification references the article",
    related !== undefined,
  );

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is >= 1",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is <= 100",
    page.pagination.limit <= 100,
  );

  // Validate no raw payload leak: summaries must not expose 'payload' own property
  for (const item of page.data) {
    const hasPayload = Object.prototype.hasOwnProperty.call(
      item as unknown as object,
      "payload",
    );
    TestValidator.predicate(
      "notification summary must not include raw payload property",
      !hasPayload,
    );

    // Ownership: recipient should match the authenticated member when present
    if (item.recipient) {
      TestValidator.equals(
        "notification recipient is the member",
        item.recipient.username,
        member.username,
      );
    }
  }

  // 5) Authentication enforcement: unauthenticated requests must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated requests must be rejected when accessing notifications",
    async () => {
      await api.functional.discussionBoard.member.members.notifications.index(
        unauthConn,
        {
          memberUsername: member.username,
          body: { page: 1 } satisfies IDiscussionBoardNotification.IRequest,
        },
      );
    },
  );

  // 6) Ownership enforcement: other member cannot list/manage this member's notifications
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const otherEmail = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`;
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, {
      body: {
        username: `u_${RandomGenerator.alphaNumeric(8)}`,
        email: otherEmail,
        password: "Aa1!" + RandomGenerator.alphaNumeric(9),
        href: "https://example.com/ctx",
        referrer: "https://example.com/prev",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(otherMember);

  await TestValidator.error(
    "other member must not manage another member's notifications",
    async () => {
      await api.functional.discussionBoard.member.members.notifications.index(
        otherConn,
        {
          memberUsername: member.username,
          body: { page: 1 } satisfies IDiscussionBoardNotification.IRequest,
        },
      );
    },
  );

  // 7) Bulk operation: mark matched notifications as read (atomic semantics)
  //    Use the articleId filter and request a bulkAction; the DTO allows any
  //    shape for IBulkAction so we send an action descriptor.
  const preBulkPage = page; // previous results

  const bulkBody = {
    articleId: article.id,
    bulkAction: { action: "mark_as_read", apply_to_all: true },
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardNotification.IRequest;

  const postBulkPage: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.members.notifications.index(
      connection,
      {
        memberUsername: member.username,
        body: bulkBody,
      },
    );
  typia.assert(postBulkPage);

  // 8) Re-query the same filter and validate side effects: compare updated timestamps
  const recheck: IPageIDiscussionBoardNotification.ISummary =
    await api.functional.discussionBoard.member.members.notifications.index(
      connection,
      {
        memberUsername: member.username,
        body: {
          articleId: article.id,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(recheck);

  const prevTimes = preBulkPage.data.map((d) => d.updatedAt ?? d.createdAt);
  const newTimes = recheck.data.map((d) => d.updatedAt ?? d.createdAt);

  // If no items existed previously, we've already asserted existence; now ensure something changed
  TestValidator.notEquals(
    "bulk operation should mutate notifications (updatedAt differs)",
    prevTimes,
    newTimes,
  );
}
