import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_article_drafts_create } from "../../../generate/generate_random_discussion_board_user_article_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_article_draft_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create multiple drafts with intentionally spaced timestamps
  const draftCount = 15;
  const drafts: IDiscussionBoardArticleDraft[] = [];
  // Create base timestamp and increment for each draft
  const baseDate = new Date();
  for (let i = 0; i < draftCount; i++) {
    // Create draft with specific timestamp
    const draft =
      await generate_random_discussion_board_user_article_drafts_create(
        userConnection,
        {
          body: {
            draft_title: `Draft ${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
            draft_content: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IDiscussionBoardArticleDraft.ICreate,
        },
      );
    typia.assert(draft);
    drafts.push(draft);
  }
  // Wait briefly to ensure all drafts are persisted
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Test pagination with different page sizes
  const pageSizes = [5, 10, 15] as const;
  for (const limit of pageSizes) {
    const page1 =
      await api.functional.discussionBoard.user.article_drafts.index(
        userConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardArticleDraft.IRequest,
        },
      );
    typia.assert(page1);
    TestValidator.equals(
      `page 1 with limit ${limit} has correct data count`,
      page1.data.length,
      Math.min(limit, draftCount),
    );
    TestValidator.equals(
      `page 1 with limit ${limit} has correct pagination metadata`,
      page1.pagination,
      {
        current: 1,
        limit: limit,
        records: draftCount,
        pages: Math.ceil(draftCount / limit),
      } satisfies IPage.IPagination,
    );
    // Test second page if applicable
    if (draftCount > limit) {
      const page2 =
        await api.functional.discussionBoard.user.article_drafts.index(
          userConnection,
          {
            body: {
              page: 2,
              limit: limit,
            } satisfies IDiscussionBoardArticleDraft.IRequest,
          },
        );
      typia.assert(page2);
      TestValidator.equals(
        `page 2 with limit ${limit} has correct data count`,
        page2.data.length,
        Math.min(limit, draftCount - limit),
      );
      TestValidator.equals(
        `page 2 with limit ${limit} has correct pagination metadata`,
        page2.pagination,
        {
          current: 2,
          limit: limit,
          records: draftCount,
          pages: Math.ceil(draftCount / limit),
        } satisfies IPage.IPagination,
      );
    }
    // Test page beyond total pages (should return empty data)
    const lastPage = Math.ceil(draftCount / limit);
    const beyondPage =
      await api.functional.discussionBoard.user.article_drafts.index(
        userConnection,
        {
          body: {
            page: lastPage + 1,
            limit: limit,
          } satisfies IDiscussionBoardArticleDraft.IRequest,
        },
      );
    typia.assert(beyondPage);
    TestValidator.equals(
      `page beyond total pages should return empty data`,
      beyondPage.data.length,
      0,
    );
  }
  // Test draft status filtering
  const draftStatusResults =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(draftStatusResults);
  TestValidator.predicate(
    "draft status filter should return only draft status items",
    draftStatusResults.data.every((draft) => draft.draft_status === "draft"),
  );
  // Test date range filtering
  // Sort drafts by timestamp to get reliable range boundaries
  const sortedDrafts = [...drafts].sort(
    (a, b) =>
      new Date(a.lastSavedAt).getTime() - new Date(b.lastSavedAt).getTime(),
  );
  const middleIndex = Math.floor(sortedDrafts.length / 2);
  const middleDraft = sortedDrafts[middleIndex];
  // Get drafts saved after the middle draft (inclusive)
  const laterDrafts =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          last_saved_after: middleDraft.lastSavedAt,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(laterDrafts);
  TestValidator.predicate(
    "later drafts should be saved after or equal to the middle draft timestamp",
    laterDrafts.data.every(
      (draft) => draft.last_saved_at >= middleDraft.lastSavedAt,
    ),
  );
  // Get drafts saved before the middle draft (exclusive)
  const earlierDrafts =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          last_saved_before: middleDraft.lastSavedAt,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(earlierDrafts);
  TestValidator.predicate(
    "earlier drafts should be saved before the middle draft timestamp",
    earlierDrafts.data.every(
      (draft) => draft.last_saved_at < middleDraft.lastSavedAt,
    ),
  );
  // Test combined date range
  const firstDraft = sortedDrafts[0];
  const lastDraft = sortedDrafts[sortedDrafts.length - 1];
  const rangeDrafts =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          last_saved_after: firstDraft.lastSavedAt,
          last_saved_before: lastDraft.lastSavedAt,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(rangeDrafts);
  TestValidator.predicate(
    "range drafts should be within the specified date range",
    rangeDrafts.data.every(
      (draft) =>
        draft.last_saved_at >= firstDraft.lastSavedAt &&
        draft.last_saved_at <= lastDraft.lastSavedAt,
    ),
  );
  // Test stable ordering (should be by last_saved_at descending)
  const orderedDrafts =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          limit: draftCount,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(orderedDrafts);
  // Verify drafts are ordered by last_saved_at descending
  for (let i = 1; i < orderedDrafts.data.length; i++) {
    TestValidator.predicate(
      `draft ${i} should have earlier or equal timestamp than draft ${i - 1}`,
      orderedDrafts.data[i].last_saved_at <=
        orderedDrafts.data[i - 1].last_saved_at,
    );
  }
}
