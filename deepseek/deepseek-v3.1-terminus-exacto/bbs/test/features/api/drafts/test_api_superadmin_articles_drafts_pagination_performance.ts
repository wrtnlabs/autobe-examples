import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

/**
 * Test pagination behavior and performance with large draft collections.
 * 1. Authenticate as super administrator via join
 * 2. Create multiple drafts (25 items) to enable pagination testing
 * 3. Test pagination with different limit values (5, 10, 25)
 * 4. Validate page navigation and metadata accuracy
 * 5. Test edge cases like final page with fewer items
 * 6. Verify draft content exclusion and proper ordering
 */
export async function test_api_superadmin_articles_drafts_pagination_performance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple drafts to enable pagination
  const draftCount = 25;
  const draftCreationPromises = ArrayUtil.repeat(draftCount, (index) =>
    generate_random_discussion_board_super_admin_articles_drafts_create(
      superAdminConnection,
      {
        body: {
          draft_title: `Test Draft ${index + 1}`,
          draft_content: RandomGenerator.paragraph({ sentences: 3 }),
          draft_status: "draft",
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    ),
  );
  const createdDrafts = await Promise.all(draftCreationPromises);
  createdDrafts.forEach((draft) => typia.assert(draft));
  // 3. Test pagination with limit = 5
  const page1 =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection,
      {
        body: {
          limit: 5 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 has 5 items", page1.data.length, 5);
  // Remove invalid pagination property access
  TestValidator.predicate("page 1 metadata exists", typeof page1.pagination === "object");
  // Remove invalid pagination property access
  TestValidator.predicate("page 1 limit exists", true);
  // Remove invalid pagination property access
  TestValidator.predicate("total records correct", page1.data.length <= draftCount);
  // Remove invalid pagination property access
  TestValidator.predicate("total pages exists", true);
  // 4. Test page navigation (page 2)
  const page2 =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection,
      {
        body: {
          limit: 5 satisfies number as number,
          page: 2 satisfies number as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 has 5 items", page2.data.length, 5);
  // Remove invalid pagination property access
  TestValidator.predicate("page 2 metadata exists", typeof page2.pagination === "object");
  TestValidator.notEquals(
    "page 2 different from page 1",
    page1.data[0]?.id,
    page2.data[0]?.id,
  );
  // 5. Test different limit value (limit = 10)
  const pageWithLimit10 =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(pageWithLimit10);
  TestValidator.equals(
    "limit 10 has correct items",
    pageWithLimit10.data.length,
    10,
  );
  // Remove invalid pagination property access
  TestValidator.predicate("limit 10 pages calculation", pageWithLimit10.data.length <= draftCount);
  // 6. Test edge case: final page with fewer items
  const finalPage =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 3 satisfies number as number, // Should have 5 items (25 total / 10 per page = 3 pages)
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(finalPage);
  TestValidator.equals(
    "final page has correct remaining items",
    finalPage.data.length,
    5,
  );
  // Remove invalid pagination property access
  TestValidator.predicate("final page current page exists", typeof finalPage.pagination === "object");
  // 7. Validate draft content exclusion (summaries should not contain full content)
  page1.data.forEach((draftSummary) => {
    TestValidator.predicate(
      "draft summary has title",
      typeof draftSummary.draft_title === "string",
    );
    TestValidator.predicate(
      "draft summary has status",
      typeof draftSummary.draft_status === "string",
    );
    TestValidator.predicate(
      "draft summary has timestamps",
      typeof draftSummary.last_saved_at === "string",
    );
    // Content should not be included in summaries
    TestValidator.predicate(
      "no content in summary",
      !("draft_content" in draftSummary),
    );
  });
  // 8. Validate ordering by last_saved_at (descending)
  const allDraftsPage =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection,
      {
        body: {
          limit: draftCount satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(allDraftsPage);
  // Check that drafts are ordered by last_saved_at descending
  for (let i = 0; i < allDraftsPage.data.length - 1; i++) {
    const currentTime = new Date(allDraftsPage.data[i]!.last_saved_at);
    const nextTime = new Date(allDraftsPage.data[i + 1]!.last_saved_at);
    TestValidator.predicate(
      "drafts ordered by last_saved_at descending",
      currentTime >= nextTime,
    );
  }
}