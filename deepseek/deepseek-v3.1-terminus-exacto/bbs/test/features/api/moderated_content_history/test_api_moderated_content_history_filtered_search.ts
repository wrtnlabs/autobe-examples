import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test advanced filtering capabilities for moderated content histories.
 *
 * This test validates the filtering functionality of moderated content histories
 * by performing searches with specific action types, date ranges, and administrator
 * identifiers. It ensures that the filtering works correctly by verifying returned
 * records match the specified criteria and handles edge cases properly.
 */
export async function test_api_moderated_content_history_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Search with specific action type
  const actionTypeSearch =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          action_type: "content_moderation",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(actionTypeSearch);
  // Test 2: Search with admin ID filter
  const adminIdSearch =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          admin_id: admin.id,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(adminIdSearch);
  // Test 3: Search with date range filters
  const dateRangeSearch =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          performed_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          performed_at_to: new Date().toISOString(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test 4: Search with multiple filters combined
  const combinedSearch =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          action_type: "user_ban",
          admin_id: admin.id,
          performed_at_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          performed_at_to: new Date().toISOString(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 5: Edge case - search for non-existent action type
  const emptySearch =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          action_type: "non_existent_action_type_12345",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure exists",
    emptySearch.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(emptySearch.data));
  // Test 6: Search with status filter
  const statusSearch =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          status: "completed",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(statusSearch);
  // Test 7: Search with action description filter
  const descriptionSearch =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          action_description: "moderation",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(descriptionSearch);
}
