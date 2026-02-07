import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Perform super admin join operation with empty body (as per IDiscussionBoardSuperAdmin.IJoin definition)
  const result = await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // Validate the response structure
  typia.assert(result);
  // Verify authentication token is present and properly structured
  TestValidator.predicate("token exists", () => result.token !== undefined);
  TestValidator.equals(
    "access token present",
    result.token.access !== undefined,
    true,
  );
  TestValidator.equals(
    "refresh token present",
    result.token.refresh !== undefined,
    true,
  );
  // Validate token expiration fields
  TestValidator.equals(
    "expired_at present",
    result.token.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "refreshable_until present",
    result.token.refreshable_until !== undefined,
    true,
  );
  // Verify expiration dates are in ISO format
  TestValidator.predicate(
    "expired_at format",
    () => !isNaN(Date.parse(result.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until format",
    () => !isNaN(Date.parse(result.token.refreshable_until)),
  );
  // Verify access token is a non-empty string (JWT format)
  TestValidator.predicate(
    "access token format",
    () =>
      typeof result.token.access === "string" && result.token.access.length > 0,
  );
  // Verify refresh token is a non-empty string
  TestValidator.predicate(
    "refresh token format",
    () =>
      typeof result.token.refresh === "string" &&
      result.token.refresh.length > 0,
  );
  // Verify expiration times are in the future
  const now = new Date();
  TestValidator.predicate(
    "expired_at in future",
    () => new Date(result.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until in future",
    () => new Date(result.token.refreshable_until) > now,
  );
}
