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

export async function test_api_administrator_drafts_search_no_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create baseline drafts for contrast
  const draft1 =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: "Test Draft One Technical Manual",
          draft_content:
            "This is the first draft containing technical documentation",
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft1);
  const draft2 =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: "User Manual Second Edition",
          draft_content: "User guide and manual for the second version",
          draft_status: "published",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft2);
  // Test 1: Search for non-existent keyword
  const search1 =
    await api.functional.discussionBoard.admin.articles_drafts.index(
      adminConnection,
      {
        body: {
          search_title: "NonexistentKeywordXYZ123",
          search_content: "ThisDoesNotExist",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(search1);
  TestValidator.equals(
    "non-existent search returns empty",
    search1.data.length,
    0,
  );
  // Test 2: Filter by future date range (no drafts exist yet)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const search2 =
    await api.functional.discussionBoard.admin.articles_drafts.index(
      adminConnection,
      {
        body: {
          last_saved_at_from: futureDate.toISOString(),
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(search2);
  TestValidator.equals(
    "future date filter returns empty",
    search2.data.length,
    0,
  );
  // Test 3: Filter by invalid status
  const search3 =
    await api.functional.discussionBoard.admin.articles_drafts.index(
      adminConnection,
      {
        body: {
          status: "invalid_status_xyz",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(search3);
  TestValidator.equals("invalid status returns empty", search3.data.length, 0);
  // Test 4: Combine restrictive filters
  const search4 =
    await api.functional.discussionBoard.admin.articles_drafts.index(
      adminConnection,
      {
        body: {
          search_title: "Nonexistent",
          search_content: "Technical",
          status: "archived",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(search4);
  TestValidator.equals(
    "combined restrictive filters return empty",
    search4.data.length,
    0,
  );
  // Test 5: Very specific date range with no matching drafts
  const specificDate = new Date("2020-01-01T00:00:00Z");
  const nextDay = new Date("2020-01-02T00:00:00Z");
  const search5 =
    await api.functional.discussionBoard.admin.articles_drafts.index(
      adminConnection,
      {
        body: {
          draft_created_at_from: specificDate.toISOString(),
          draft_created_at_to: nextDay.toISOString(),
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(search5);
  TestValidator.equals(
    "specific date range returns empty",
    search5.data.length,
    0,
  );
  // Test 6: Exact pagination beyond empty result
  const search6 =
    await api.functional.discussionBoard.admin.articles_drafts.index(
      adminConnection,
      {
        body: {
          search_title: "XYZNonexistent",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(search6);
  TestValidator.equals(
    "pagination beyond returns empty",
    search6.data.length,
    0,
  );
}
