import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge case scenario where search criteria yield no results.
 * This scenario validates the system's handling of empty result sets by applying
 * filter criteria that are unlikely to match any existing moderation logs
 * (e.g., future date ranges, non-existent administrator IDs, or specific
 * action types that haven't been used). The test should verify that the
 * response correctly returns an empty data array with proper pagination
 * metadata indicating zero records. Validate that the system handles empty
 * results gracefully without errors.
 */
export async function test_api_content_moderation_logs_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Use future date ranges to ensure no existing logs match
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  // Search with criteria that should yield no results
  const response =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection,
      {
        body: {
          admin_id: null,
          created_at_from: futureDate.toISOString(),
          created_at_to: futureDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(response);
  // Validate empty results
  TestValidator.equals("data array should be empty", response.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
}
