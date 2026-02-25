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

export async function test_api_superadmin_articles_drafts_search_with_date_ranges(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Prepare reference dates for testing
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const dateToString = (date: Date) => date.toISOString();
  // Test 1: Filter by last_saved_at range
  const lastSavedRangeResults =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {
          last_saved_at_from: dateToString(twoDaysAgo),
          last_saved_at_to: dateToString(now),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(lastSavedRangeResults);
  // Test 2: Filter by draft_created_at range
  const createdRangeResults =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {
          draft_created_at_from: dateToString(fourDaysAgo),
          draft_created_at_to: dateToString(oneDayAgo),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(createdRangeResults);
  // Test 3: Filter by draft_updated_at range
  const updatedRangeResults =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {
          draft_updated_at_from: dateToString(threeDaysAgo),
          draft_updated_at_to: dateToString(now),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(updatedRangeResults);
  // Test 4: Combination filtering with text search
  const combinedResults =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {
          search_title: RandomGenerator.substring(RandomGenerator.content()),
          last_saved_at_from: dateToString(fiveDaysAgo),
          last_saved_at_to: dateToString(now),
          draft_created_at_from: dateToString(fiveDaysAgo),
          draft_updated_at_from: dateToString(threeDaysAgo),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(combinedResults);
  // Test 5: Edge case - very narrow date range
  const narrowRangeResults =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {
          draft_created_at_from: dateToString(
            new Date(now.getTime() - 60 * 60 * 1000),
          ), // 1 hour ago
          draft_created_at_to: dateToString(now),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(narrowRangeResults);
  // Test 6: Combination with status filter
  const statusDateResults =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {
          status: "draft",
          draft_created_at_from: dateToString(threeDaysAgo),
          draft_created_at_to: dateToString(oneDayAgo),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<30>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(statusDateResults);
  // Validate business logic only (not type validation)
  // Fix: Using 'page' property instead of 'current'
  TestValidator.predicate(
    "date range filters should return pagination data",
    (lastSavedRangeResults as any).pagination.page >= 1,
  );
}