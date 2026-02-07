import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering ban durations by permanent status.
 *
 * This test validates that super administrators can filter ban durations
 * to show only permanent ban options. It verifies that the filtering
 * functionality correctly returns only ban durations with is_permanent=true
 * and excludes temporary ban options.
 */
export async function test_api_super_admin_ban_durations_filter_permanent(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Filter ban durations by permanent status
  const response =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          is_permanent: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(response);
  // Validate that all returned ban durations are permanent
  TestValidator.predicate(
    "all ban durations should be permanent",
    response.data.every((duration) => duration.is_permanent === true),
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    response.pagination.pages >= 0,
  );
  // Test business logic: if there are records, they should all be permanent bans
  if (response.data.length > 0) {
    TestValidator.predicate(
      "all filtered durations should be permanent bans",
      response.data.every((duration) => duration.is_permanent),
    );
  }
}
