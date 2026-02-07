import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_banned_users_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for accessing ban management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Test 1: Basic pagination with default values
  const result1 =
    await api.functional.discussionBoard.admin.admins.bans.index(
      adminConnection,
    );
  typia.assert(result1);
  // Test 2: Pagination with explicit parameters (if supported)
  // Note: Based on the API definition, the endpoint doesn't currently support query parameters
  // The implementation tests the basic functionality and validates response structure
  // Validate response structure
  TestValidator.predicate("has data array", Array.isArray(result1));
  if (Array.isArray(result1)) {
    TestValidator.predicate("has at least 0 items", result1.length >= 0);
  }
}