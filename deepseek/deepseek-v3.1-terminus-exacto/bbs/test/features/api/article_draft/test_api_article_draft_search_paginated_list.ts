import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_admin_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_article_draft_search_paginated_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create multiple drafts
  const draftCount = 15;
  const draftIds: string[] = [];
  const draftTitles: string[] = [];
  for (let i = 0; i < draftCount; i++) {
    const draft =
      await generate_random_discussion_board_admin_articles_drafts_create(
        adminConnection,
        {
          body: {
            draft_title: RandomGenerator.paragraph({ sentences: 2 }),
            draft_content: RandomGenerator.content({ paragraphs: 2 }),
            draft_status: RandomGenerator.pick([
              "draft",
              "published",
              "archived",
            ] as const),
          } satisfies IDiscussionBoardArticleDraft.ICreate,
        },
      );
    typia.assert(draft);
    draftIds.push(draft.id);
    draftTitles.push(draft.draft_title);
  }
  // 3. Search drafts with pagination
  const searchResult =
    await api.functional.discussionBoard.admin.articles_drafts.own.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(searchResult);
  // Fix: Access the deeply nested pagination structure correctly
  // Based on the DTO definitions, the structure is:
  // searchResult.pagination.pagination.pagination.pagination (IPage.IPagination)
  const actualPagination =
    searchResult.pagination.pagination.pagination.pagination;
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination object exists",
    actualPagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    actualPagination.current,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "limit is 10",
    actualPagination.limit,
    10 satisfies number as number,
  );
  TestValidator.predicate(
    "total records at least draft count",
    actualPagination.records >= draftCount,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    actualPagination.pages ===
      Math.ceil(actualPagination.records / actualPagination.limit),
  );
  // 5. Validate draft summaries
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  TestValidator.equals(
    "data length matches limit or less",
    searchResult.data.length <= actualPagination.limit,
    true,
  );
  for (const summary of searchResult.data) {
    typia.assert(summary);
    // Verify required fields exist
    TestValidator.predicate("has id", summary.id !== undefined);
    TestValidator.predicate(
      "has draft_title",
      summary.draft_title !== undefined,
    );
    TestValidator.predicate(
      "has draft_status",
      summary.draft_status !== undefined,
    );
    TestValidator.predicate(
      "has last_saved_at",
      summary.last_saved_at !== undefined,
    );
    TestValidator.predicate(
      "has draft_created_at",
      summary.draft_created_at !== undefined,
    );
    TestValidator.predicate(
      "has draft_updated_at",
      summary.draft_updated_at !== undefined,
    );
    // Verify draft belongs to authenticated admin (security check)
    TestValidator.predicate(
      "draft ID is from created drafts",
      draftIds.includes(summary.id),
    );
    // Ensure full content not included
    TestValidator.equals(
      "draft_content not in summary",
      (summary as any).draft_content,
      undefined,
    );
    TestValidator.equals(
      "recovery_data not in summary",
      (summary as any).recovery_data,
      undefined,
    );
  }
  // 6. Verify sorting (default should be last_saved_at DESC)
  if (searchResult.data.length > 1) {
    for (let i = 1; i < searchResult.data.length; i++) {
      const prevDate = new Date(searchResult.data[i - 1].last_saved_at);
      const currDate = new Date(searchResult.data[i].last_saved_at);
      TestValidator.predicate(
        `sorted by last_saved_at DESC: item ${i - 1} >= item ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
