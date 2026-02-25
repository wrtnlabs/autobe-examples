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

export async function test_api_superadmin_articles_drafts_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // Create first super admin connection
  const superAdminConnection1: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create test drafts with various edge cases for first super admin
  const drafts1 = await ArrayUtil.asyncRepeat(5, async (index) => {
    const draft =
      await generate_random_discussion_board_super_admin_articles_drafts_create(
        superAdminConnection1,
        {
          body: {
            draft_title:
              index === 0
                ? ""
                : index === 1
                  ? "Special chars: !@#$%^&*()"
                  : index === 2
                    ? RandomGenerator.paragraph({ sentences: 10 })
                    : index === 3
                      ? "Very long title " + "x".repeat(100)
                      : "Normal draft",
            draft_content:
              index === 0
                ? ""
                : index === 1
                  ? "Content with special chars: <>{}[]\\|/"
                  : index === 2
                    ? RandomGenerator.content({ paragraphs: 3 })
                    : index === 3
                      ? "x".repeat(1000)
                      : "Normal content",
            draft_status: index === 4 ? "published" : "draft",
            recovery_data: index % 2 === 0 ? { autoSave: "data" } : null,
          } satisfies IDiscussionBoardArticleDraft.ICreate,
        },
      );
    typia.assert(draft);
    return draft;
  });
  // Create second super admin connection
  const superAdminConnection2: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create drafts for second super admin
  const drafts2 = await ArrayUtil.asyncRepeat(3, async (index) => {
    const draft =
      await generate_random_discussion_board_super_admin_articles_drafts_create(
        superAdminConnection2,
        {
          body: {
            draft_title: `Admin2 Draft ${index}`,
            draft_content: `Content for admin2 draft ${index}`,
            draft_status: "draft",
          } satisfies IDiscussionBoardArticleDraft.ICreate,
        },
      );
    typia.assert(draft);
    return draft;
  });
  // Test 1: Empty search criteria for first admin
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {} satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Test 2: Search by title for first admin
  const titleSearch =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {
          search_title: "Special chars",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(titleSearch);
  // Test 3: Search by content for first admin
  const contentSearch =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {
          search_content: "special chars",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(contentSearch);
  // Test 4: Filter by status for first admin
  const statusSearch =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {
          status: "published",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(statusSearch);
  // Test 5: Conflicting date ranges (from date after to date) for first admin
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString();
  const conflictingDates =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {
          draft_created_at_from: futureDate,
          draft_created_at_to: pastDate,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(conflictingDates);
  // Test 6: Valid pagination for first admin
  const validPagination =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(validPagination);
  // Test 7: Combined filters for first admin
  const combinedFilters =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {
          search_title: "Normal",
          status: "draft",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Test 8: Date range filtering for first admin
  const dateRange =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {
          draft_created_at_from: new Date(Date.now() - 86400000).toISOString(),
          draft_created_at_to: new Date().toISOString(),
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(dateRange);
  // Test 9: Cross-user data leakage validation
  // Second admin should not see first admin's drafts
  const admin2Search =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection2,
      {
        body: {} satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(admin2Search);
  // Verify second admin only sees their own drafts
  TestValidator.equals(
    "admin2 sees only their drafts",
    admin2Search.data.length,
    drafts2.length,
  );
  // First admin should not see second admin's drafts
  const admin1Search =
    await api.functional.discussionBoard.superAdmin.articles_drafts.own.index(
      superAdminConnection1,
      {
        body: {
          search_title: "Admin2",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(admin1Search);
  TestValidator.equals(
    "admin1 does not see admin2 drafts",
    admin1Search.data.length,
    0,
  );
}
