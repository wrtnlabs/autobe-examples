import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering ban records by specific ban status.
 * An administrator searches for ban records filtered by 'active' status.
 * The test should verify that only active ban records are returned in the response.
 * Validate that the ban_status field in all returned records matches the requested filter.
 * Test the pagination functionality with status filtering to ensure it works correctly with filtered results.
 */
export async function test_api_admin_ban_records_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Filter ban records by active status
  const response = await api.functional.discussionBoard.admin.ban_records.index(
    adminConnection,
    {
      body: {
        ban_status: "active",
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(response);
  // Validate that all returned records have active status
  for (const record of response.data) {
    TestValidator.equals(
      "ban status should be active",
      record.ban_status,
      "active",
    );
  }
  // Validate pagination metadata makes sense for filtered results
  TestValidator.predicate(
    "records count should match data length",
    response.pagination.records === response.data.length ||
      response.pagination.limit > response.data.length,
  );
  TestValidator.predicate(
    "current page should be valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be reasonable",
    response.pagination.limit > 0,
  );
}
