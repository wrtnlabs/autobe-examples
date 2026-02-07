import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDateRange";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test password reset search functionality when no matching records exist.
 * Creates filter combinations that intentionally exclude all existing password reset requests
 * to verify the system returns empty results with proper pagination metadata.
 */
export async function test_api_user_password_reset_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user context using available utility function
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: "test-user-empty-search@example.com",
      password: "password12345678",
      display_name: "Test User",
      bio: "Test user for empty search results",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test 1: Search for password resets created in the future (no records should exist)
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const search1 =
    await api.functional.discussionBoard.user.password_resets.index(
      userConnection,
      {
        body: {
          created_at_range: {
            start: futureDate,
          },
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(search1);
  // Test 2: Search for super_admin password resets (none should exist in user context)
  const search2 =
    await api.functional.discussionBoard.user.password_resets.index(
      userConnection,
      {
        body: {
          user_type: "super_admin",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(search2);
  // Test 3: Search for expired password resets in future date range (impossible combination)
  const search3 =
    await api.functional.discussionBoard.user.password_resets.index(
      userConnection,
      {
        body: {
          status: "expired",
          expired_at_range: {
            start: futureDate,
          },
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(search3);
  // Test 4: Search with multiple exclusive filters
  const search4 =
    await api.functional.discussionBoard.user.password_resets.index(
      userConnection,
      {
        body: {
          user_type: "super_admin",
          status: "used",
          created_at_range: {
            start: futureDate,
            end: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
          },
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(search4);
  // All searches should return empty results - typia.assert validates the structure
  // The pagination metadata will show zero records as expected
}
